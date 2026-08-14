import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

async function getCompanyIdForUser(supabase: any) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
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
 * POST /api/inter/integrations
 * Salva (ou atualiza) as credenciais do Banco Inter para a empresa.
 * Body esperado:
 * {
 *   client_id: string,
 *   client_secret: string,
 *   cert: string,       // conteúdo PEM do .crt
 *   key: string,        // conteúdo PEM do .key
 *   account: string,    // número da conta (só dígitos)
 *   env: "sandbox" | "production"
 * }
 */
export async function POST(req: Request) {
  const supabase = await createRouteSupabaseClient();

  try {
    const body = await req.json().catch(() => ({}));

    const client_id = String(body?.client_id ?? "").trim();
    const client_secret = String(body?.client_secret ?? "").trim();
    const cert = String(body?.cert ?? "").trim();
    const key = String(body?.key ?? "").trim();
    const account = String(body?.account ?? "").replace(/\D/g, ""); // só dígitos
    const env = (body?.env === "sandbox" ? "sandbox" : "production") as "sandbox" | "production";

    // Validações mínimas
    if (!client_id) {
      return NextResponse.json({ error: "client_id é obrigatório" }, { status: 400 });
    }
    if (!client_secret) {
      return NextResponse.json({ error: "client_secret é obrigatório" }, { status: 400 });
    }
    if (!cert || !cert.includes("BEGIN CERTIFICATE")) {
      return NextResponse.json(
        { error: "Certificado (.crt) inválido ou ausente. Deve ser um PEM com 'BEGIN CERTIFICATE'." },
        { status: 400 },
      );
    }
    if (!key || (!key.includes("BEGIN RSA PRIVATE KEY") && !key.includes("BEGIN PRIVATE KEY"))) {
      return NextResponse.json(
        { error: "Chave privada (.key) inválida ou ausente. Deve ser um PEM com 'BEGIN PRIVATE KEY'." },
        { status: 400 },
      );
    }
    if (!account) {
      return NextResponse.json({ error: "Número da conta corrente é obrigatório" }, { status: 400 });
    }

    const companyId = await getCompanyIdForUser(supabase);

    // Upsert na tabela company_integrations para o provider banco_inter
    const { error: upsertErr } = await supabase
      .from("company_integrations")
      .upsert(
        {
          company_id: companyId,
          provider: "banco_inter",
          access_token: client_id, // usamos access_token como client_id para manter compatibilidade de schema
          env,
          inter_client_id: client_id,
          inter_client_secret: client_secret,
          inter_cert: cert,
          inter_key: key,
          inter_account: account,
        },
        { onConflict: "company_id,provider" },
      );

    if (upsertErr) {
      return NextResponse.json(
        { error: `Falha ao salvar integração: ${upsertErr.message}` },
        { status: 400 },
      );
    }

    // ─── Configurar Webhook no Banco Inter ────────────────────────────────────
    try {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const baseUrl = host ? `${proto}://${host}` : new URL(req.url).origin;
      const webhookUrl = `${baseUrl}/api/inter/webhook`;

      const { interFetch } = await import("@/lib/inter");
      
      const creds = {
        clientId: client_id,
        clientSecret: client_secret,
        cert,
        key,
        account,
        env,
      };

      await interFetch(creds, "/cobrancas/webhook", {
        method: "PUT",
        body: JSON.stringify({ webhookUrl }),
      });
      console.log(`[Inter] Webhook configurado com sucesso para: ${webhookUrl}`);
    } catch (whErr: any) {
      console.error("[Inter] Falha ao configurar webhook:", whErr?.message || whErr);
      // Não interrompemos o fluxo, pois as credenciais já foram salvas.
      // O usuário pode tentar salvar novamente depois se o webhook falhou.
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erro inesperado" },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/inter/integrations
 * Remove as credenciais do Banco Inter para a empresa.
 */
export async function DELETE() {
  const supabase = await createRouteSupabaseClient();

  try {
    const companyId = await getCompanyIdForUser(supabase);

    const { error: delErr } = await supabase
      .from("company_integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", "banco_inter");

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
