import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type Provider = "asaas";

async function getCompanyIdForUser(supabase: any) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) throw new Error("Not authenticated");

  // Se você tem a VIEW current_user_company_id, ótimo:
  const { data: row, error } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();

  if (error) throw new Error("Falha ao obter company_id");
  if (!row?.company_id) throw new Error("company_id não encontrado");

  return row.company_id as string;
}

export async function POST(req: Request) {
  const supabase = createRouteSupabaseClient();

  try {
    const body = await req.json().catch(() => ({}));
    const provider: Provider = "asaas";
    const access_token = String(body?.access_token ?? "").trim();
    const webhook_token = String(body?.webhook_token ?? "").trim() || null;

    if (!access_token) {
      return NextResponse.json(
        { error: "access_token é obrigatório" },
        { status: 400 },
      );
    }

    const companyId = await getCompanyIdForUser(supabase);

    const { error: upsertErr } = await supabase
      .from("company_integrations")
      .upsert(
        { company_id: companyId, provider, access_token, webhook_token },
        { onConflict: "company_id,provider" },
      );

    if (upsertErr) {
      return NextResponse.json(
        { error: `Upsert falhou: ${upsertErr.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const supabase = createRouteSupabaseClient();

  try {
    const provider: Provider = "asaas";
    const companyId = await getCompanyIdForUser(supabase);

    const { error: delErr } = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);

    if (delErr) {
      return NextResponse.json(
        { error: `Delete falhou: ${delErr.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}
