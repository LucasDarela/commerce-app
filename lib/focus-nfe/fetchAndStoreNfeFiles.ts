// lib/focus-nfe/fetchAndStoreNfeFiles.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Use a chave service_role apenas no backend
);

const FOCUS_TOKEN = process.env.FOCUS_TOKEN!;

export async function fetchAndStoreNfeFiles(ref: string, invoiceId: string) {
  const headers = {
    Authorization: `Token token=${FOCUS_TOKEN}`,
  };

  try {
    // Busca XML e PDF da Focus
    const [xmlRes, pdfRes] = await Promise.all([
      fetch(`https://api.focusnfe.com.br/v2/nfe/${ref}.xml`, {
        headers,
      }),
      fetch(`https://api.focusnfe.com.br/v2/nfe/${ref}.pdf`, {
        headers,
      }),
    ]);

    if (!xmlRes.ok || !pdfRes.ok) {
      throw new Error("Erro ao buscar XML ou PDF na Focus NFe.");
    }

    const xmlBlob = await xmlRes.blob();
    const pdfBlob = await pdfRes.blob();

    // Salva no Supabase Storage
    const xmlPath = `xml/${ref}.xml`;
    const pdfPath = `pdf/${ref}.pdf`;

    await supabase.storage.from("nfe-files").upload(xmlPath, xmlBlob, {
      contentType: "application/xml",
      upsert: true,
    });

    await supabase.storage.from("nfe-files").upload(pdfPath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

    const { data: xmlUrlData } = supabase.storage
      .from("nfe-files")
      .getPublicUrl(xmlPath);
    const { data: pdfUrlData } = supabase.storage
      .from("nfe-files")
      .getPublicUrl(pdfPath);

    // Atualiza a tabela invoices
    await supabase
      .from("invoices")
      .update({
        xml_url: xmlUrlData.publicUrl,
        danfe_url: pdfUrlData.publicUrl,
      })
      .eq("id", invoiceId);

    return {
      success: true,
      xmlUrl: xmlUrlData.publicUrl,
      pdfUrl: pdfUrlData.publicUrl,
    };
  } catch (error: any) {
    console.error("Erro ao buscar ou salvar arquivos da NF-e:", error.message);
    return { success: false, error: error.message };
  }
}
