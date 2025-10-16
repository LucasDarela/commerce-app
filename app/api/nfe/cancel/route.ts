import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { ref, motivo, companyId } = await req.json();

    if (!ref || !motivo || !companyId)
      return new Response("Dados incompletos", { status: 400 });

    // 🔑 Pegue o token Focus NFe da empresa
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("focus_token")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company?.focus_token)
      return new Response("Token Focus NFe não encontrado", { status: 401 });

    // 🚀 Requisição para cancelar NF-e
    const res = await fetch(`https://api.focusnfe.com.br/v2/nfe/${ref}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${btoa(`${company.focus_token}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ motivo }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Erro Focus NFe:", payload);
      return new Response(JSON.stringify(payload), { status: res.status });
    }

    // ✅ Atualiza status no Supabase
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "cancelada" })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (updateError) {
      console.error("Erro ao atualizar status no Supabase:", updateError);
    }

    return Response.json({
      message: payload.mensagem ?? "NF-e cancelada com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro geral cancelamento:", err);
    return new Response("Erro interno", { status: 500 });
  }
}
