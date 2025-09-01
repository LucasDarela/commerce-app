// lib/focus-nfe/fetchInvoiceStatus.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type FetchStatusArgs = {
  supabase: SupabaseClient;
  companyId: string;
  ref: string;
  poll?: number;
  intervalMs?: number;
  includeRaw?: boolean;
};

export type FetchStatusOk = {
  data: {
    status?: string | null;
    numero?: number | null;
    serie?: string | number | null;
    chave?: string | null;
    xml_url?: string | null;
    danfe_url?: string | null;
    data_emissao?: string | null;
  };
  mensagem_sefaz: string | null;
  raw?: any;
};

export type FetchStatusErr = {
  error: string;
  mensagem_sefaz?: string | null;
  raw?: any;
  data?: undefined;
};

export async function fetchInvoiceStatus(
  args: FetchStatusArgs,
): Promise<FetchStatusOk | FetchStatusErr> {
  const {
    supabase,
    companyId,
    ref,
    poll = 0,
    intervalMs = 1500,
    includeRaw = false,
  } = args;

  const { data: cred, error: credErr } = await supabase
    .from("nfe_credentials")
    .select("focus_token, environment")
    .eq("company_id", companyId)
    .maybeSingle();

  if (credErr || !cred?.focus_token) {
    return { error: "Token da Focus não configurado." };
  }

  const env = (cred.environment ?? "homologacao") as "homologacao" | "producao";
  const baseURL =
    env === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : "https://homologacao.focusnfe.com.br/v2";

  const token = String(cred.focus_token)
    .trim()
    .replace(/\r?\n|\r/g, "");
  const auth = `Basic ${Buffer.from(`${token}:`).toString("base64")}`;

  // 2) Função de 1 chamada
  const once = async (): Promise<FetchStatusOk | FetchStatusErr> => {
    const url = `${baseURL}/nfe/${encodeURIComponent(ref)}`;
    const resp = await fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });

    const rawText = await resp.text();
    let body: any = rawText;
    try {
      body = JSON.parse(rawText);
    } catch {}

    if (!resp.ok) {
      return {
        error:
          body?.mensagem ||
          body?.erros?.[0]?.mensagem ||
          `Focus ${resp.status}`,
        mensagem_sefaz: extractMensagemSefaz(body),
        raw: includeRaw ? body : undefined,
      };
    }

    const out: FetchStatusOk = {
      data: {
        status: body?.status ?? null,
        numero: body?.numero ?? null,
        serie: body?.serie ?? null,
        chave: body?.chave_nfe ?? body?.chave ?? null,
        xml_url: body?.links?.xml ?? body?.xml ?? null,
        danfe_url: body?.links?.danfe ?? body?.danfe ?? null,
        data_emissao: body?.data_emissao ?? body?.dataEmissao ?? null,
      },
      mensagem_sefaz: extractMensagemSefaz(body),
      raw: includeRaw ? body : undefined,
    };

    return out;
  };

  let res = await once();

  if (
    poll > 0 &&
    !("error" in res) &&
    res.data &&
    isAuthorized(res.data.status) &&
    (!res.data.xml_url || !res.data.danfe_url)
  ) {
    for (let i = 0; i < poll; i++) {
      await sleep(intervalMs);
      const r = await once();
      if (!("error" in r) && r.data && (r.data.xml_url || r.data.danfe_url)) {
        res = r;
        break;
      }
      res = r;
    }
  }

  return res;
}

// ---------- helpers ----------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isAuthorized(status?: string | null) {
  // Focus usa 'autorizada' ou 'autorizado' (varia)
  if (!status) return false;
  const s = status.toString().toLowerCase();
  return s.includes("autorizad");
}

function extractMensagemSefaz(body: any): string | null {
  return (
    body?.mensagem_sefaz ||
    body?.motivo ||
    body?.motivo_sefaz ||
    body?.retornos?.[0]?.mensagem ||
    (Array.isArray(body?.erros)
      ? body.erros
          .map((e: any) => e?.mensagem)
          .filter(Boolean)
          .join("; ")
      : null) ||
    null
  );
}
