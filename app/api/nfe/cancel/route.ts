import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { ref, motivo, companyId } = await req.json();

    if (!ref || !motivo || !companyId) {
      return Response.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("focus_token")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company?.focus_token) {
      return Response.json(
        { error: "Token Focus NFe não encontrado" },
        { status: 401 },
      );
    }

    // Requisição para Focus (confirme método/endpoint com a doc da Focus)
    const res = await fetch(`https://api.focusnfe.com.br/v2/nfe/${ref}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${btoa(`${company.focus_token}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ motivo }),
    });

    // tente parsear JSON, mas proteja caso não seja JSON
    let payload: any = {};
    try {
      payload = await res.json();
    } catch {
      const text = await res.text().catch(() => "");
      payload = { message: text || null };
    }

    if (!res.ok) {
      console.error("Erro Focus NFe:", payload);
      // devolve o payload da Focus (ou uma mensagem padronizada) como JSON
      return Response.json(
        {
          error: payload?.mensagem ?? payload?.message ?? "Erro na Focus NFe",
          payload,
        },
        { status: res.status },
      );
    }

    // Atualiza status no Supabase
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "cancelada" })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (updateError) {
      console.error("Erro ao atualizar status no Supabase:", updateError);
      // não interrompe o fluxo, mas retorna aviso
      return Response.json(
        {
          warning: "Cancelado na Focus, mas falha ao atualizar Supabase",
          details: updateError,
        },
        { status: 200 },
      );
    }

    return Response.json({
      message: payload?.mensagem ?? "NF-e cancelada com sucesso!",
      payload,
    });
  } catch (err: any) {
    console.error("Erro geral cancelamento:", err);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
