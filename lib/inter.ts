import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import https from "https";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterEnv = "sandbox" | "production";

export type InterCreds = {
  clientId: string;
  clientSecret: string;
  cert: string;       // PEM string (.crt)
  key: string;        // PEM string (.key)
  account: string;    // Número da conta corrente (só dígitos)
  env: InterEnv;
};

export type InterCobranca = {
  seuNumero: string;
  valorNominal: number;
  dataVencimento: string; // YYYY-MM-DD
  pagador: {
    cpfCnpj: string;
    tipoPessoa: "FISICA" | "JURIDICA";
    nome: string;
    email?: string;
    ddd?: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  mensagem?: {
    linha1?: string;
    linha2?: string;
    linha3?: string;
    linha4?: string;
    linha5?: string;
  };
  desconto?: {
    codigoDesconto: "NAOTEMDESCONTO" | "VALORFIXODATAINFORMADA" | "PERCENTUALDATAINFORMADA";
    taxa?: number;
    valor?: number;
    quantidadeDias?: number;
  };
  multa?: {
    codigoMulta: "NAOTEMMULTA" | "VALORFIXO" | "PERCENTUAL";
    taxa?: number;
    valor?: number;
  };
  mora?: {
    codigoMora: "NAOTEMMORA" | "TAXAMENSAL" | "ISENTO" | "VALORDIA";
    taxa?: number;
    valor?: number;
  };
  formasRecebimento?: ("BOLETO" | "PIX")[];
};

// ─── Base URLs ────────────────────────────────────────────────────────────────

function oauthUrl(env: InterEnv) {
  return env === "sandbox"
    ? "https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token"
    : "https://cdpj.partners.bancointer.com.br/oauth/v2/token";
}

function apiBaseUrl(env: InterEnv) {
  return env === "sandbox"
    ? "https://cdpj-sandbox.partners.uatinter.co/cobranca/v3"
    : "https://cdpj.partners.bancointer.com.br/cobranca/v3";
}

// ─── mTLS Agent cache (one per company/env) ───────────────────────────────────

const agentCache = new Map<string, https.Agent>();

function getAgent(creds: InterCreds): https.Agent {
  const cacheKey = `${creds.clientId}:${creds.env}`;
  if (agentCache.has(cacheKey)) return agentCache.get(cacheKey)!;

  const agent = new https.Agent({
    cert: creds.cert,
    key: creds.key,
    rejectUnauthorized: true,
  });

  agentCache.set(cacheKey, agent);
  return agent;
}

// ─── OAuth Token Cache ────────────────────────────────────────────────────────

type CachedToken = {
  accessToken: string;
  expiresAt: number; // ms since epoch
};

const tokenCache = new Map<string, CachedToken>();

async function fetchOAuthToken(creds: InterCreds): Promise<string> {
  const cacheKey = `${creds.clientId}:${creds.env}`;
  const cached = tokenCache.get(cacheKey);

  // Reutiliza o token se ainda tiver >2 min de validade
  if (cached && cached.expiresAt - Date.now() > 120_000) {
    console.log("[Inter] Reutilizando token OAuth em cache.");
    return cached.accessToken;
  }

  const bodyStr = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "client_credentials",
    scope: "boleto-cobranca.read boleto-cobranca.write",
  }).toString();

  const urlObj = new URL(oauthUrl(creds.env));

  // Banco Inter API v3 requer mTLS até mesmo para obter o token OAuth.
  // Como o 'fetch' nativo não suporta agent/certificados de forma simples, 
  // usamos https.request nativo.
  return new Promise<string>((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
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
          return reject(new Error(`[Inter OAuth] ${res.statusCode}: ${data}`));
        }

        let json: any = null;
        try {
          json = JSON.parse(data);
        } catch {}

        if (!json || !json.access_token) {
          return reject(new Error(`[Inter OAuth] Retorno inválido: ${data}`));
        }

        const expiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
        tokenCache.set(cacheKey, { accessToken: json.access_token, expiresAt });
        console.log("[Inter] Novo token OAuth obtido, expira em:", new Date(expiresAt).toISOString());

        resolve(json.access_token);
      });
    });

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Fetch helper com mTLS ────────────────────────────────────────────────────

export async function interFetch<T>(
  creds: InterCreds,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await fetchOAuthToken(creds);
  const url = `${apiBaseUrl(creds.env)}${path}`;

  console.log("[Inter] fetch:", creds.env, url);

  // Usa https.request do Node nativo para suportar mTLS
  return new Promise<T>((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = (init?.body as string | undefined) ?? undefined;

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: (init?.method as string) ?? "GET",
      cert: creds.cert,
      key: creds.key,
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-conta-corrente": creds.account,
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        ...((init?.headers as Record<string, string>) ?? {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json: any = null;
        try { json = data ? JSON.parse(data) : null; } catch {}

        if (!res.statusCode || res.statusCode >= 400) {
          const msg = json?.message ?? json?.title ?? res.statusMessage ?? "Erro Inter";
          let details = "";
          if (json?.violacoes && Array.isArray(json.violacoes)) {
            details = " | " + json.violacoes.map((v: any) => `${v.propriedade}: ${v.razao}`).join(", ");
          }
          const err: any = new Error(`[Inter] ${res.statusCode}: ${msg}${details}`);
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

export async function getInterCredsForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<InterCreds> {
  const { data: integ, error } = await supabase
    .from("company_integrations")
    .select(
      "inter_client_id, inter_client_secret, inter_cert, inter_key, inter_account, env",
    )
    .eq("company_id", companyId)
    .eq("provider", "banco_inter")
    .maybeSingle();

  if (error) throw error;

  if (
    !integ?.inter_client_id ||
    !integ?.inter_client_secret ||
    !integ?.inter_cert ||
    !integ?.inter_key ||
    !integ?.inter_account
  ) {
    throw new Error(
      "Credenciais do Banco Inter não configuradas para esta empresa. Configure em Configurações > Integrações.",
    );
  }

  const env: InterEnv =
    integ.env === "sandbox" || integ.env === "production"
      ? (integ.env as InterEnv)
      : "production";

  return {
    clientId: integ.inter_client_id,
    clientSecret: integ.inter_client_secret,
    cert: integ.inter_cert,
    key: integ.inter_key,
    account: integ.inter_account,
    env,
  };
}

// ─── Criar cobrança + polling ────────────────────────────────────────────────

type InterCreateResult = {
  codigoSolicitacao: string;
  nossoNumero?: string;
  codigoBarras?: string;
  linhaDigitavel?: string;
  pixCopiaECola?: string;
  linkVisualizacao?: string;
};

export async function createInterCobranca(
  creds: InterCreds,
  payload: InterCobranca,
): Promise<{
  codigoSolicitacao: string;
  linhaDigitavel: string | null;
  codigoBarras: string | null;
  linkVisualizacao: string | null;
  pixCopiaECola: string | null;
}> {
  // 1. Cria a cobrança
  const created = await interFetch<InterCreateResult>(creds, "/cobrancas", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[Inter] Cobrança criada:", created.codigoSolicitacao);

  let linhaDigitavel = created.linhaDigitavel ?? null;
  let codigoBarras = created.codigoBarras ?? null;
  let linkVisualizacao = created.linkVisualizacao ?? null;
  let pixCopiaECola = created.pixCopiaECola ?? null;

  // 2. Polling — aguarda processamento assíncrono (até 5 tentativas × 3s)
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 1; attempt <= 5; attempt++) {
    if (linhaDigitavel && codigoBarras) break;

    await sleep(3000);

    try {
      const detail: any = await interFetch(
        creds,
        `/cobrancas/${created.codigoSolicitacao}`,
        { method: "GET" },
      );
      
      // A API v3 no GET retorna campos aninhados em 'boleto' e 'pix'
      const resLinha = detail?.boleto?.linhaDigitavel || detail?.linhaDigitavel;
      const resBarras = detail?.boleto?.codigoBarras || detail?.codigoBarras;
      // Montar a URL absoluta do nosso proxy do PDF
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.chopphub.com';
      const resLink = `${baseUrl}/api/inter/boleto/${created.codigoSolicitacao}/pdf`;
      const resPix = detail?.pix?.pixCopiaECola || detail?.pixCopiaECola;

      if (resLinha) linhaDigitavel = resLinha;
      if (resBarras) codigoBarras = resBarras;
      if (resLink) linkVisualizacao = resLink;
      if (resPix) pixCopiaECola = resPix;

      console.log(`[Inter] polling tentativa ${attempt}/5:`, {
        linhaDigitavel,
        codigoBarras,
      });
    } catch (err) {
      console.warn(`[Inter] polling tentativa ${attempt}/5 - erro:`, err);
    }
  }

  return {
    codigoSolicitacao: created.codigoSolicitacao,
    linhaDigitavel,
    codigoBarras,
    linkVisualizacao,
    pixCopiaECola,
  };
}
