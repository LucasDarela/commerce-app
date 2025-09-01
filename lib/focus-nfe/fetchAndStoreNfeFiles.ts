// lib/focus-nfe/fetchAndStoreNfeFiles.ts
import { createClient } from "@supabase/supabase-js";

type Result =
  | { success: true; pdfUrl: string | null; xmlUrl: string | null }
  | { success: false; error: string };

export async function fetchAndStoreNfeFiles(
  ref: string,
  invoiceId: string,
  companyId: string,
): Promise<Result> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // precisa permissão de write no Storage
  );

  // 1) Credenciais Focus
  const { data: cred, error: credErr } = await supabase
    .from("nfe_credentials")
    .select("focus_token, environment")
    .eq("company_id", companyId)
    .maybeSingle();

  if (credErr || !cred?.focus_token) {
    return { success: false, error: "Token da Focus não configurado." };
  }

  const env = (cred.environment ?? "homologacao") as "homologacao" | "producao";
  const apiV2 =
    env === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : "https://homologacao.focusnfe.com.br/v2";
  const hostBase =
    env === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

  const auth =
    "Basic " + Buffer.from(`${cred.focus_token}:`).toString("base64");

  // 2) Status (para pegar caminhos reais)
  const stResp = await fetch(`${apiV2}/nfe/${encodeURIComponent(ref)}`, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });
  const stText = await stResp.text();
  let st: any = {};
  try {
    st = JSON.parse(stText);
  } catch {}

  if (!stResp.ok) {
    const msg =
      st?.mensagem || st?.erros?.[0]?.mensagem || `Focus ${stResp.status}`;
    return { success: false, error: msg };
  }

  // 3) Normalizar URLs: priorize os *paths* (caminho_*)
  const toAbs = (p?: string | null) =>
    !p ? null : p.startsWith("http") ? p : `${hostBase}${p}`;

  const xmlUrlAbs =
    toAbs(st?.caminho_xml_nota_fiscal) ||
    toAbs(st?.links?.xml) || // fallback
    null;

  const pdfUrlAbs =
    toAbs(st?.caminho_danfe) ||
    toAbs(st?.links?.danfe) || // fallback
    null;

  if (!xmlUrlAbs && !pdfUrlAbs) {
    return {
      success: false,
      error: "Links/path de XML/DANFE não encontrados no status.",
    };
  }

  const bucket = "nfe-files";
  let savedXmlPublicUrl: string | null = null;
  let savedPdfPublicUrl: string | null = null;

  // 4) Baixar XML binário e salvar. Vamos guardar o buffer para extrair <dhEmi/>.
  let xmlBuffer: Buffer | null = null;

  if (xmlUrlAbs) {
    const r = await fetch(xmlUrlAbs, {
      headers: { Authorization: auth, Accept: "application/xml" },
    });
    if (r.ok) {
      xmlBuffer = Buffer.from(await r.arrayBuffer()); // <- BINÁRIO
      const path = `xml/${ref}.xml`;
      await supabase.storage.from(bucket).upload(path, xmlBuffer, {
        upsert: true,
        contentType: "application/xml",
        cacheControl: "public, max-age=31536000, immutable",
      });
      savedXmlPublicUrl = supabase.storage.from(bucket).getPublicUrl(path)
        .data.publicUrl;
    }
  }

  // 5) Baixar PDF binário e salvar
  if (pdfUrlAbs) {
    const r = await fetch(pdfUrlAbs, {
      headers: { Authorization: auth, Accept: "application/pdf" },
    });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer()); // <- BINÁRIO
      const path = `pdf/${ref}.pdf`;
      await supabase.storage.from(bucket).upload(path, buf, {
        upsert: true,
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000, immutable",
      });
      savedPdfPublicUrl = supabase.storage.from(bucket).getPublicUrl(path)
        .data.publicUrl;
    }
  }

  // 6) Definir data_emissao:
  //    - se o status tiver, usa; senão, tenta extrair do XML (<dhEmi>…</dhEmi>)
  const toDateYMD = (s: string) => {
    const d = new Date(s);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  let dataEmissao: string | null =
    st?.data_emissao || st?.data_autorizacao || null;

  if (!dataEmissao && xmlBuffer) {
    const xml = xmlBuffer.toString("utf-8");
    const m = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/);
    if (m?.[1]) {
      // dhEmi vem como 2025-08-30T22:06:45-03:00 -> guarda apenas a data
      dataEmissao = toDateYMD(m[1]);
    }
  }

  // 7) Atualizar a invoice
  await supabase
    .from("invoices")
    .update({
      xml_url: savedXmlPublicUrl,
      danfe_url: savedPdfPublicUrl,
      status: st?.status ?? null,
      numero: st?.numero ?? null,
      serie: st?.serie ?? null,
      chave_nfe: st?.chave_nfe ?? st?.chave ?? null,
      data_emissao: dataEmissao, // <- agora tenta preencher
    })
    .eq("id", invoiceId);

  return {
    success: true,
    pdfUrl: savedPdfPublicUrl,
    xmlUrl: savedXmlPublicUrl,
  };
}
