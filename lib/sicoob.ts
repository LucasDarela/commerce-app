import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import https from "https";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SicoobEnv = "sandbox" | "production";

export type SicoobCreds = {
  clientId: string;
  cert: string;
  key: string;
  numeroContrato: number;
  numeroConta: number;
  env: SicoobEnv;
};

export type SicoobBoleto = {
  numeroContrato: number;
  modalidade: number;
  numeroContaCorrente: number;
  especieDocumento: string;
  dataEmissao: string;
  seuNumero: string;
  valor: number;
  dataVencimento: string;
  hibrido?: boolean;
  pagador: {
    nomeRazaoSocial: string;
    numeroCpfCnpj: string;
    codigoTipoInscricao?: number;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
    email?: string;
    complemento?: string;
  };
  mensagem?: {
    linha1?: string;
    linha2?: string;
    linha3?: string;
    linha4?: string;
    linha5?: string;
  };
  desconto?: {
    codigoDesconto: number;
    taxa?: number;
    valor?: number;
    dataDesconto?: string;
  };
  multa?: {
    codigoMulta: number;
    taxa?: number;
    valor?: number;
  };
  mora?: {
    codigoMora: number;
    taxa?: number;
    valor?: number;
  };
};

// ─── Base URLs ────────────────────────────────────────────────────────────────

const AUTH_URL = "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token";

function apiBaseUrl(env: SicoobEnv) {
  return env === "sandbox"
    ? "https://sandbox.sicoob.com.br/sicoob/sandbox/cobranca-bancaria/v3"
    : "https://api.sicoob.com.br/cobranca-bancaria/v3";
}

// ─── Token Cache ──────────────────────────────────────────────────────────────

type CachedToken = { accessToken: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function fetchOAuthToken(creds: SicoobCreds): Promise<string> {
  const cacheKey = `sicoob:${creds.clientId}:${creds.env}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - Date.now() > 60_000) {
    console.log("[Sicoob] Reutilizando token OAuth em cache.");
    return cached.accessToken;
  }

  const bodyStr = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    scope: "cobranca_boletos_incluir cobranca_boletos_consultar",
  }).toString();

  const urlObj = new URL(AUTH_URL);

  return new Promise<string>((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      cert: creds.cert,
      key: creds.key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (!res.statusCode || res.statusCode >= 400) {
          return reject(new Error(`[Sicoob OAuth] ${res.statusCode}: ${data}`));
        }
        let json: any = null;
        try { json = JSON.parse(data); } catch {}
        if (!json?.access_token) {
          return reject(new Error(`[Sicoob OAuth] Retorno inválido: ${data}`));
        }
        const expiresAt = Date.now() + (json.expires_in ?? 300) * 1000;
        tokenCache.set(cacheKey, { accessToken: json.access_token, expiresAt });
        console.log("[Sicoob] Novo token obtido, expira em:", new Date(expiresAt).toISOString());
        resolve(json.access_token);
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

export async function sicoobFetch<T>(
  creds: SicoobCreds,
  path: string,
  init?: { method?: string; body?: string },
): Promise<T> {
  const token = await fetchOAuthToken(creds);
  const url = `${apiBaseUrl(creds.env)}${path}`;
  console.log("[Sicoob] fetch:", creds.env, url);

  return new Promise<T>((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = init?.body;

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: init?.method ?? "GET",
      cert: creds.cert,
      key: creds.key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json: any = null;
        try { json = data ? JSON.parse(data) : null; } catch {}
        if (!res.statusCode || res.statusCode >= 400) {
          const msg = json?.mensagem ?? json?.message ?? json?.titulo ?? res.statusMessage ?? "Erro Sicoob";
          const erros = Array.isArray(json?.erros) ? " | " + json.erros.map((e: any) => e.mensagem ?? e).join(", ") : "";
          const err: any = new Error(`[Sicoob] ${res.statusCode}: ${msg}${erros}`);
          err.status = res.statusCode;
          err.body = json ?? data;
          return reject(err);
        }
        resolve(json as T);
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Ler credenciais do Supabase ──────────────────────────────────────────────

export async function getSicoobCredsForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<SicoobCreds> {
  const { data: integ, error } = await supabase
    .from("company_integrations")
    .select("sicoob_client_id, sicoob_cert, sicoob_key, sicoob_numero_contrato, sicoob_numero_conta, env")
    .eq("company_id", companyId)
    .eq("provider", "sicoob")
    .maybeSingle();

  if (error) throw error;

  if (!integ?.sicoob_client_id || !integ?.sicoob_cert || !integ?.sicoob_key || !integ?.sicoob_numero_contrato || !integ?.sicoob_numero_conta) {
    throw new Error("Credenciais do Sicoob não configuradas para esta empresa. Configure em Configurações > Integrações.");
  }

  const env: SicoobEnv = integ.env === "sandbox" || integ.env === "production" ? (integ.env as SicoobEnv) : "production";

  return {
    clientId: integ.sicoob_client_id,
    cert: integ.sicoob_cert,
    key: integ.sicoob_key,
    numeroContrato: Number(integ.sicoob_numero_contrato),
    numeroConta: Number(integ.sicoob_numero_conta),
    env,
  };
}

// ─── Criar boleto ─────────────────────────────────────────────────────────────

type SicoobCreateResult = {
  codigoRetorno?: number;
  mensagemRetorno?: string;
  resultado?: {
    codigoLinhaDigitavel?: string;
    codigoBarras?: string;
    codigoSolicitacao?: string;
    nossoNumero?: string;
    urlBoleto?: string;
    qrCode?: { qrCode?: string; urlQrCode?: string };
  };
};

export async function createSicoobBoleto(
  creds: SicoobCreds,
  payload: SicoobBoleto,
): Promise<{
  codigoSolicitacao: string;
  nossoNumero: string | null;
  linhaDigitavel: string | null;
  codigoBarras: string | null;
  urlBoleto: string | null;
  pixCopiaECola: string | null;
}> {
  const created = await sicoobFetch<SicoobCreateResult>(creds, "/boletos", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[Sicoob] Boleto criado:", JSON.stringify(created));

  const resultado = created.resultado;
  const codigoSolicitacao = resultado?.codigoSolicitacao ?? resultado?.nossoNumero ?? String(payload.seuNumero);

  let linhaDigitavel = resultado?.codigoLinhaDigitavel ?? null;
  let codigoBarras = resultado?.codigoBarras ?? null;
  let urlBoleto = resultado?.urlBoleto ?? null;
  let pixCopiaECola = resultado?.qrCode?.qrCode ?? null;
  const nossoNumero = resultado?.nossoNumero ?? null;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 1; attempt <= 5; attempt++) {
    if (linhaDigitavel && codigoBarras) break;
    await sleep(3000);
    try {
      const detail = await sicoobFetch<SicoobCreateResult>(creds, `/boletos/${codigoSolicitacao}`, { method: "GET" });
      const r = detail.resultado;
      if (r?.codigoLinhaDigitavel) linhaDigitavel = r.codigoLinhaDigitavel;
      if (r?.codigoBarras) codigoBarras = r.codigoBarras;
      if (r?.urlBoleto) urlBoleto = r.urlBoleto;
      if (r?.qrCode?.qrCode) pixCopiaECola = r.qrCode.qrCode;
      console.log(`[Sicoob] polling ${attempt}/5:`, { linhaDigitavel, codigoBarras });
    } catch (err) {
      console.warn(`[Sicoob] polling ${attempt}/5 - erro:`, err);
    }
  }

  return { codigoSolicitacao, nossoNumero, linhaDigitavel, codigoBarras, urlBoleto, pixCopiaECola };
}
