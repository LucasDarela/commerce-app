import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // 🔒 1. autenticação SEMPRE primeiro
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    // 📦 2. body
    const { ref, motivo } = await req.json();

    if (!ref || !motivo) {
      return NextResponse.json(
        { error: "ref e motivo são obrigatórios" },
        { status: 400 },
      );
    }

    // 🔗 3. company_id
    const { data: companyUser, error: companyError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError || !companyUser?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário" },
        { status: 401 },
      );
    }

    const companyId = companyUser.company_id;

    // 🔐 4. credenciais NFe
    const { data: credentials, error: credentialsError } = await supabase
      .from("nfe_credentials")
      .select("focus_token, environment")
      .eq("company_id", companyId)
      .maybeSingle();

    if (credentialsError || !credentials?.focus_token) {
      return NextResponse.json(
        { error: "Token Focus NFe não encontrado" },
        { status: 401 },
      );
    }

    const { focus_token, environment } = credentials;

    const baseUrl =
      environment === "homologacao"
        ? "https://homologacao.focusnfe.com.br"
        : "https://api.focusnfe.com.br";

    const url = `${baseUrl}/v2/nfe/${ref}`;

    // 🚀 5. request Focus
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${focus_token}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ justificativa: motivo }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao cancelar NFe", details: data },
        { status: response.status },
      );
    }

    // ✅ 6. update local
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "cancelado" })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (updateError) {
      console.error("Erro ao atualizar status no Supabase:", updateError);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao cancelar NFe:", error);

    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}