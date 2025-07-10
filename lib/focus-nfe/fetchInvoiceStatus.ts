import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import axios from "axios";

export async function fetchInvoiceStatus(ref: string, companyId: string) {
  const supabase = createServerComponentClient({ cookies });

  // Busca o token da empresa no Supabase
  const { data: credentials, error: credentialError } = await supabase
    .from("nfe_credentials")
    .select("focus_token")
    .eq("company_id", companyId)
    .single();

  if (credentialError || !credentials?.focus_token) {
    console.error("Token de emissão da empresa não encontrado");
    return {
      error: "Token de emissão não configurado para esta empresa.",
    };
  }

  const token = credentials.focus_token;

  // Chamada para a Focus
  try {
    const { data } = await axios.get(
      `https://api.focusnfe.com.br/v2/nfe/${ref}`,
      {
        auth: {
          username: token,
          password: "x",
        },
      },
    );

    return { data };
  } catch (error: any) {
    console.error(
      "Erro ao buscar status da NF-e:",
      error.response?.data || error.message,
    );
    return { error: error.response?.data || error.message };
  }
}
