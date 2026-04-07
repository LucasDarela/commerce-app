import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { serie, numero_inicial, numero_final, justificativa, companyId: companyIdFromBody } =
      await req.json();

    if (!serie || !numero_inicial || !numero_final || !justificativa) {
      return NextResponse.json(
        { error: "serie, numero_inicial, numero_final e justificativa são obrigatórios" },
        { status: 400 },
      );
    }

    if (justificativa.trim().length < 15) {
      return NextResponse.json(
        { error: "A justificativa deve ter no mínimo 15 caracteres." },
        { status: 400 },
      );
    }

    let companyId: string | undefined = companyIdFromBody;

    if (!companyId) {
      const { data: cu } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      companyId = cu?.company_id ?? undefined;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 400 },
      );
    }

    const { data: credentials, error: credError } = await supabase
      .from("nfe_credentials")
      .select("focus_token, environment, cnpj")
      .eq("company_id", companyId)
      .maybeSingle();

    if (credError || !credentials?.focus_token || !credentials?.cnpj) {
      return NextResponse.json(
        { error: "Credenciais Focus NFe não configuradas (token ou CNPJ ausentes)" },
        { status: 401 },
      );
    }

    const { focus_token, environment, cnpj } = credentials;

    const baseUrl =
      environment === "producao"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    const auth = `Basic ${Buffer.from(`${focus_token}:`).toString("base64")}`;

    const response = await fetch(`${baseUrl}/v2/nfe/inutilizacao`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cnpj,
        serie: String(serie),
        numero_inicial: String(numero_inicial),
        numero_final: String(numero_final),
        justificativa: justificativa.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.mensagem ||
            data?.mensagem_sefaz ||
            "Erro ao inutilizar numeração",
          mensagem_sefaz: data?.mensagem_sefaz ?? null,
          details: data,
        },
        { status: response.status },
      );
    }

    // Salvar registro de inutilização no banco local
    await supabase.from("invoices").update({ status: "inutilizado" })
      .eq("serie", String(serie))
      .gte("numero", String(numero_inicial))
      .lte("numero", String(numero_final))
      .eq("company_id", companyId);

    return NextResponse.json({
      success: true,
      status: data?.status,
      mensagem_sefaz: data?.mensagem_sefaz ?? null,
      protocolo_sefaz: data?.protocolo_sefaz ?? null,
    });
  } catch (error: any) {
    console.error("Erro ao inutilizar NFe:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
