import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";

type Provider = "mercado_pago" | "asaas";

async function getCompanyIdForUser(
  supabase: ReturnType<typeof createRouteHandlerClient<Database>>,
) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Not authenticated");
  }

  // Padrão com view segura (SECURITY DEFINER) que retorna company_id
  const { data: row, error } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();

  if (error) {
    console.error("[integrations] current_user_company_id error:", error);
    throw new Error("Falha ao obter company_id");
  }

  if (!row?.company_id) {
    // Se cair aqui, a view pode não estar com SECURITY DEFINER, ou o usuário não está vinculado
    throw new Error("company_id não encontrado para o usuário atual");
  }

  return row.company_id as string;
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  try {
    const body = await req.json().catch(() => ({}));
    const provider = body?.provider as Provider | undefined;
    const access_token = (body?.access_token ?? "").trim();

    if (!provider || !access_token) {
      return NextResponse.json(
        { error: "provider e access_token são obrigatórios" },
        { status: 400 },
      );
    }
    if (provider !== "mercado_pago" && provider !== "asaas") {
      return NextResponse.json({ error: "provider inválido" }, { status: 400 });
    }

    const companyId = await getCompanyIdForUser(supabase);

    // delete + insert (sem ON CONFLICT)
    const del = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);

    if (del.error) {
      console.error("[integrations] delete error:", del.error);
      return NextResponse.json(
        { error: `Delete falhou: ${del.error.message}` },
        { status: 400 },
      );
    }

    const ins = await supabase
      .from("company_integrations")
      .insert({ company_id: companyId, provider, access_token });

    if (ins.error) {
      console.error("[integrations] insert error:", ins.error);
      return NextResponse.json(
        { error: `Insert falhou: ${ins.error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[integrations] unexpected:", e);
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as Provider | null;
    if (!provider) {
      return NextResponse.json(
        { error: "provider é obrigatório" },
        { status: 400 },
      );
    }

    const companyId = await getCompanyIdForUser(supabase);

    const del = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);

    if (del.error) {
      console.error("[integrations] delete error:", del.error);
      return NextResponse.json(
        { error: `Delete falhou: ${del.error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[integrations] unexpected:", e);
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}
