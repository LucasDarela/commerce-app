// app/api/cnpj/route.ts
import { NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

type CnpjResult = {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  abertura?: string;
  situacao?: string;
  natureza_juridica?: string;
  atividades_principais?: Array<{ code: string; text: string }>;
  atividades_secundarias?: Array<{ code: string; text: string }>;
};

const memoryCache = new Map<string, { data: CnpjResult; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h em memória
const BROWSER_MAX_AGE = 60 * 10; // 10 min p/ navegador

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const digits = (s: string) => (s || "").replace(/\D/g, "");

async function withRetries<T>(
  fn: () => Promise<T>,
  {
    tries = 3,
    baseDelayMs = 400,
  }: { tries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? 0;

      // Para 429/5xx: backoff exponencial com jitter
      if (status === 429 || status >= 500) {
        const delay = Math.round(
          baseDelayMs * Math.pow(2, i) + Math.random() * 250,
        );
        await sleep(delay);
        continue;
      }
      // Para 4xx (exceto 429) não adianta retry
      break;
    }
  }
  throw lastErr;
}

function normalizeFromBrasilAPI(data: any): CnpjResult {
  return {
    cnpj: digits(data.cnpj),
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    logradouro: data.descricao_tipo_logradouro
      ? `${data.descricao_tipo_logradouro} ${data.logradouro}`.trim()
      : data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    cep: digits(data.cep),
    telefone: digits(data.ddd_telefone_1 || data.ddd_telefone_2 || ""),
    email: data.email,
    abertura: data.data_situacao_cadastral,
    situacao: data.descricao_situacao_cadastral,
    natureza_juridica: data.natureza_juridica,
    atividades_principais: data.cnae_fiscal
      ? [{ code: String(data.cnae_fiscal), text: data.cnae_fiscal_descricao }]
      : undefined,
    atividades_secundarias: Array.isArray(data.cnaes_secundarios)
      ? data.cnaes_secundarios.map((x: any) => ({
          code: String(x.codigo),
          text: x.descricao,
        }))
      : undefined,
  };
}

function normalizeFromReceitaWS(data: any): CnpjResult {
  return {
    cnpj: digits(data.cnpj),
    razao_social: data.nome,
    nome_fantasia: data.fantasia,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    cep: digits(data.cep),
    telefone: digits(data.telefone),
    email: data.email,
    abertura: data.abertura,
    situacao: data.situacao,
    natureza_juridica: data.natureza_juridica,
    atividades_principais: Array.isArray(data.atividade_principal)
      ? data.atividade_principal.map((x: any) => ({
          code: x.code,
          text: x.text,
        }))
      : undefined,
    atividades_secundarias: Array.isArray(data.atividades_secundarias)
      ? data.atividades_secundarias.map((x: any) => ({
          code: x.code,
          text: x.text,
        }))
      : undefined,
  };
}

async function getFromBrasilAPI(cnpj: string): Promise<CnpjResult> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  const { data } = await withRetries(
    () =>
      axios.get(url, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "DarelaApp/1.0 (CNPJ lookup)",
        },
      }),
    { tries: 2, baseDelayMs: 300 },
  );
  return normalizeFromBrasilAPI(data);
}

async function getFromReceitaWS(cnpj: string): Promise<CnpjResult> {
  const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
  const { data } = await withRetries(
    () =>
      axios.get(url, {
        timeout: 12000,
        headers: {
          Accept: "application/json",
          "User-Agent": "DarelaApp/1.0 (CNPJ lookup)",
        },
      }),
    { tries: 3, baseDelayMs: 500 },
  );

  if (data?.status === "ERROR") {
    // A API às vezes retorna 200 com erro no body
    const err = new Error(data.message || "ReceitaWS retornou erro");
    (err as any).status = 502;
    throw err;
  }
  return normalizeFromReceitaWS(data);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("cnpj") || "";
  const cnpj = digits(raw);

  if (!cnpj || cnpj.length !== 14) {
    return NextResponse.json(
      { error: "CNPJ inválido. Envie 14 dígitos." },
      { status: 400 },
    );
  }

  // Cache em memória (melhora contra 429)
  const key = `cnpj:${cnpj}`;
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": `public, max-age=${BROWSER_MAX_AGE}` },
    });
  }

  try {
    // 1) Tenta BrasilAPI
    try {
      const res = await getFromBrasilAPI(cnpj);
      memoryCache.set(key, { data: res, expiresAt: now + CACHE_TTL_MS });
      return NextResponse.json(res, {
        headers: { "Cache-Control": `public, max-age=${BROWSER_MAX_AGE}` },
      });
    } catch (e) {
      console.warn("BrasilAPI falhou. Tentando fallback com Receitaws...");
    }

    // 2) Fallback ReceitaWS
    const res = await getFromReceitaWS(cnpj);
    memoryCache.set(key, { data: res, expiresAt: now + CACHE_TTL_MS });
    return NextResponse.json(res, {
      headers: { "Cache-Control": `public, max-age=${BROWSER_MAX_AGE}` },
    });
  } catch (err: any) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status ?? (err.status || 502);
    const body = axiosErr.response?.data;

    console.error("Erro em ambas APIs (BrasilAPI e Receitaws):", err);

    // Se tomou 429 do fallback, devolva 429 para o cliente poder tratar
    const finalStatus = status === 429 ? 429 : 502;
    return NextResponse.json(
      {
        error:
          (body as any)?.message ||
          axiosErr.message ||
          "Erro ao consultar CNPJ nas fontes públicas",
      },
      { status: finalStatus },
    );
  }
}
