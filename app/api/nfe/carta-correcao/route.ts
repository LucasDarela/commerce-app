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

    const { ref, correcao, companyId: companyIdFromBody } = await req.json();

    if (!ref || !correcao) {
      return NextResponse.json(
        { error: "ref e correcao são obrigatórios" },
        { status: 400 },
      );
    }

    if (correcao.trim().length < 15) {
      return NextResponse.json(
        { error: "A correção deve ter no mínimo 15 caracteres." },
        { status: 400 },
      );
    }

    if (correcao.trim().length > 1000) {
      return NextResponse.json(
        { error: "A correção deve ter no máximo 1000 caracteres." },
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
      .select("focus_token, environment")
      .eq("company_id", companyId)
      .maybeSingle();

    if (credError || !credentials?.focus_token) {
      return NextResponse.json(
        { error: "Token Focus NFe não configurado" },
        { status: 401 },
      );
    }

    const { focus_token, environment } = credentials;

    const baseUrl =
      environment === "producao"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    const auth = `Basic ${Buffer.from(`${focus_token}:`).toString("base64")}`;

    const response = await fetch(`${baseUrl}/v2/nfe/${ref}/carta_correcao`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ correcao: correcao.trim() }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.mensagem ||
            data?.erros?.[0]?.mensagem ||
            "Erro ao enviar Carta de Correção",
          mensagem_sefaz: data?.mensagem_sefaz ?? null,
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      status: data?.status,
      mensagem_sefaz: data?.mensagem_sefaz ?? null,
      caminho_pdf: data?.caminho_pdf_carta_correcao ?? null,
      numero_carta_correcao: data?.numero_carta_correcao ?? null,
    });
  } catch (error: any) {
    console.error("Erro ao enviar Carta de Correção:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
