import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type AsaasEnv = "sandbox" | "production";

export type AsaasCustomer = {
  id?: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
};

function baseUrl(env: AsaasEnv) {
  return env === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

export async function getAsaasTokenForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  token: string;
  env: AsaasEnv;
}> {
  const { data: integ, error: ie } = await supabase
    .from("company_integrations")
    .select("provider, access_token, env")
    .eq("company_id", companyId)
    .eq("provider", "asaas")
    .maybeSingle();

  if (ie) throw ie;

  if (!integ?.access_token) {
    throw new Error("Token do Asaas não configurado para esta empresa");
  }

  let env: AsaasEnv;

  if (integ?.env === "sandbox" || integ?.env === "production") {
    env = integ.env as AsaasEnv;
  } else if (/^test_/i.test(integ.access_token)) {
    env = "sandbox";
  } else {
    env = "production";
  }

  return { token: integ.access_token, env };
}

export async function asaasFetch<T>(
  supabase: SupabaseClient,
  companyId: string,
  path: string,
  init?: RequestInit,
  forcedEnv?: AsaasEnv,
): Promise<T> {
  const { token, env } = await getAsaasTokenForCompany(supabase, companyId);
  const resolvedEnv = forcedEnv ?? env;
  const url = `${baseUrl(resolvedEnv)}${path}`;

  console.log(
    "[Asaas] env:",
    resolvedEnv,
    "url:",
    url,
    "token_prefix:",
    token.slice(0, 6),
  );

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: token,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      json?.errors?.[0]?.description ||
      res.statusText;

    const err: any = new Error(`Asaas ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }

  return json as T;
}

export async function findCustomer(
  supabase: SupabaseClient,
  companyId: string,
  {
    cpfCnpj,
    email,
    name,
  }: {
    cpfCnpj?: string;
    email?: string;
    name?: string;
  },
) {
  if (cpfCnpj) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      supabase,
      companyId,
      `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
    );
    return data?.data?.[0] ?? null;
  }

  if (email) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      supabase,
      companyId,
      `/customers?email=${encodeURIComponent(email)}`,
    );
    return data?.data?.[0] ?? null;
  }

  if (name) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      supabase,
      companyId,
      `/customers?name=${encodeURIComponent(name)}`,
    );
    return data?.data?.[0] ?? null;
  }

  return null;
}

export async function createCustomer(
  supabase: SupabaseClient,
  companyId: string,
  c: AsaasCustomer,
) {
  return asaasFetch<any>(supabase, companyId, `/customers`, {
    method: "POST",
    body: JSON.stringify(c),
  });
}

export async function updateCustomer(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
  c: Partial<AsaasCustomer>,
) {
  return asaasFetch<any>(supabase, companyId, `/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(c),
  });
}

export function diffCustomer(
  current: any,
  desired: AsaasCustomer,
): Partial<AsaasCustomer> {
  const patch: Partial<AsaasCustomer> = {};

  (
    [
      "name",
      "cpfCnpj",
      "email",
      "phone",
      "mobilePhone",
      "address",
      "addressNumber",
      "complement",
      "province",
      "postalCode",
    ] as const
  ).forEach((k) => {
    const cur = current?.[k];
    const nxt = (desired as any)[k];

    if (typeof nxt !== "undefined" && nxt !== null && nxt !== cur) {
      (patch as any)[k] = nxt;
    }
  });

  return patch;
}