// lib/focus-nfe/emitInvoice.ts
import axios from "axios";
import { Buffer } from "buffer";

interface EmitInvoiceParams {
  companyId: string;
  invoiceData: any;
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

  if (error || !cred?.focus_token) {
    console.error("❌ Token da Focus não encontrado ou inválido");
    throw new Error("Token da Focus NFe não encontrado");
  }

  console.log("🔧 Token da empresa:", cred.focus_token);
  console.log(
    "📤 Enviando para Focus com payload:",
    JSON.stringify(invoiceData, null, 2),
  );

  console.log("📦 Payload enviado:", JSON.stringify(invoiceData, null, 2));

  try {
    const token = cred.focus_token;
    const authHeader = `Basic ${Buffer.from(`${token}:x`).toString("base64")}`;

    const response = await axios.post(
      "https://api.focusnfe.com.br/v2/nfe",
      invoiceData,
      {
        auth: {
          username: token,
          password: "x",
        },
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Resposta da Focus:", response.data);
    return response.data;
  } catch (err: any) {
    const data = err.response?.data;

    console.error(
      "❌ Erro da Focus:",
      JSON.stringify(data || err.message, null, 2),
    );

    // Se a resposta da API da Focus tiver array de erros
    if (data?.erros) {
      const mensagens = data.erros.map((e: any) => e.mensagem).join(" | ");
      throw new Error(`Erro na Focus: ${mensagens}`);
    }

    // Caso o erro seja um objeto mais simples
    if (typeof data === "string") {
      throw new Error(`Erro da Focus: ${data}`);
    }

    // Erro genérico
    throw new Error("Erro desconhecido ao comunicar com a Focus NFe");
  }
}
