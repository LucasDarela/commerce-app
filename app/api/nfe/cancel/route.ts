import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { ref, motivo } = await req.json();
    const supabase = createRouteHandlerClient({ cookies });

    // 🔒 Pega o usuário autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    // 🔗 Busca o company_id vinculado ao usuário
    const { data: companyUser, error: companyError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError || !companyUser?.company_id) {
      return Response.json(
        { error: "Empresa não encontrada para este usuário" },
        { status: 401 },
      );
    }

    const companyId = companyUser.company_id;

    // 🔍 Busca o token na tabela nfe_credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from("nfe_credentials")
      .select("focus_token, ambiente")
      .eq("company_id", companyId)
      .maybeSingle();

    if (credentialsError || !credentials?.focus_token) {
      return Response.json(
        { error: "Token Focus NFe não encontrado" },
        { status: 401 },
      );
    }

    const { focus_token, ambiente } = credentials;

    // Define a URL com base no ambiente
    const baseUrl =
      ambiente === "homologacao"
        ? "https://homologacao.focusnfe.com.br"
        : "https://api.focusnfe.com.br";

    const url = `${baseUrl}/v2/nfe/${ref}`;

    // Faz o cancelamento (HTTP DELETE com justificativa)
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
      return Response.json(
        { error: "Erro ao cancelar NFe", details: data },
        { status: response.status },
      );
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao cancelar NFe:", error);
    return Response.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
