import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

async function getCompanyIdForUser(supabase: any) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user?.id) throw new Error("Not authenticated");
  const { data: row, error } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();
  if (error) throw new Error("Falha ao obter company_id");
  if (!row?.company_id) throw new Error("company_id não encontrado");
  return row.company_id as string;
}

/**
 * POST /api/sicoob/integrations
 * Salva (ou atualiza) as credenciais do Sicoob para a empresa.
 * Body esperado:
 * {
 *   client_id: string,
 *   cert: string,             // conteúdo PEM do .crt
 *   key: string,              // conteúdo PEM do .key
 *   numero_contrato: number,  // número do contrato na cooperativa
 *   numero_conta: number,     // número da conta corrente
 *   env: "sandbox" | "production"
 * }
 */
export async function POST(req: Request) {
  const supabase = await createRouteSupabaseClient();

  try {
    const body = await req.json().catch(() => ({}));

    const client_id = String(body?.client_id ?? "").trim();
    const cert = String(body?.cert ?? "").trim();
    const key = String(body?.key ?? "").trim();
    const numero_contrato = Number(body?.numero_contrato);
    const numero_conta = Number(body?.numero_conta);
    const env = (body?.env === "sandbox" ? "sandbox" : "production") as "sandbox" | "production";

    if (!client_id) return NextResponse.json({ error: "client_id é obrigatório" }, { status: 400 });
    if (!cert || !cert.includes("BEGIN CERTIFICATE"))
      return NextResponse.json({ error: "Certificado (.crt) inválido. Deve ser um PEM com 'BEGIN CERTIFICATE'." }, { status: 400 });
    if (!key || (!key.includes("BEGIN RSA PRIVATE KEY") && !key.includes("BEGIN PRIVATE KEY")))
      return NextResponse.json({ error: "Chave privada (.key) inválida. Deve ser um PEM com 'BEGIN PRIVATE KEY'." }, { status: 400 });
    if (!numero_contrato || isNaN(numero_contrato))
      return NextResponse.json({ error: "Número do contrato é obrigatório" }, { status: 400 });
    if (!numero_conta || isNaN(numero_conta))
      return NextResponse.json({ error: "Número da conta corrente é obrigatório" }, { status: 400 });

    const companyId = await getCompanyIdForUser(supabase);

    // Remove integrações de boleto concorrentes antes de salvar
    await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .in("provider", ["asaas", "banco_inter"]);

    const { error: upsertErr } = await supabase
      .from("company_integrations")
      .upsert(
        {
          company_id: companyId,
          provider: "sicoob",
          access_token: client_id,
          env,
          sicoob_client_id: client_id,
          sicoob_cert: cert,
          sicoob_key: key,
          sicoob_numero_contrato: numero_contrato,
          sicoob_numero_conta: numero_conta,
        },
        { onConflict: "company_id,provider" },
      );

    if (upsertErr) {
      return NextResponse.json({ error: `Falha ao salvar integração: ${upsertErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro inesperado" }, { status: 400 });
  }
}

/**
 * DELETE /api/sicoob/integrations
 * Remove as credenciais do Sicoob para a empresa.
 */
export async function DELETE() {
  const supabase = await createRouteSupabaseClient();

  try {
    const companyId = await getCompanyIdForUser(supabase);
    const { error: delErr } = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", "sicoob");

    if (delErr) return NextResponse.json({ error: `Delete falhou: ${delErr.message}` }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro inesperado" }, { status: 400 });
  }
}
