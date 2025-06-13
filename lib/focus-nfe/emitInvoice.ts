// lib/focus-nfe/emitInvoice.ts
import axios from "axios";

interface EmitInvoiceParams {
  companyId: string;
  invoiceData: any; // depois vamos tipar com zod
  supabaseClient: any;
}

export async function emitInvoice({
  companyId,
  invoiceData,
  supabaseClient,
}: EmitInvoiceParams) {
  const { data: cred, error } = await supabaseClient
    .from("nfe_credentials")
    .select("focus_token")
    .eq("company_id", companyId)
    .single();

  if (error || !cred) throw new Error("Token da Focus NFe não encontrado");
  console.log("🔧 Token da empresa:", cred?.focus_token);
  console.log("📤 Enviando para Focus:", invoiceData);
  try {
    const response = await axios.post(
      "https://homologacao.focusnfe.com.br/v2/nfe",
      invoiceData,
      {
        headers: {
          Authorization: `Token token=${cred.focus_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (err: any) {
    console.error(
      "❌ Erro na resposta da Focus:",
      err.response?.data || err.message,
    );

    if (err.response?.data?.erros) {
      throw new Error(
        err.response.data.erros.map((e: any) => e.mensagem).join(" | "),
      );
    }

    throw new Error("Erro na API da Focus NFe");
  }
}
