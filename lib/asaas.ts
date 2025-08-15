import "server-only";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
  province?: string; // bairro
  postalCode?: string; // CEP
};

function baseUrl(env: AsaasEnv) {
  return env === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

async function getAsaasTokenForCompany(): Promise<{
  token: string;
  env: AsaasEnv;
}> {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: row, error } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();
  if (error || !row?.company_id) throw new Error("company_id não encontrado");

  const { data: integ, error: ie } = await supabase
    .from("company_integrations")
    .select("provider, access_token, env")
    .eq("company_id", row.company_id)
    .eq("provider", "asaas")
    .maybeSingle();
  if (ie) throw ie;
  if (!integ?.access_token) {
    throw new Error("Token do Asaas não configurado para esta empresa");
  }

  // 1) prioriza env do BD se válido; 2) heurística pelo prefixo; 3) default production
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
  path: string,
  init?: RequestInit,
  forcedEnv?: AsaasEnv,
): Promise<T> {
  const { token, env } = await getAsaasTokenForCompany();
  const url = `${baseUrl(forcedEnv ?? env)}${path}`;

  console.log(
    "[Asaas] env:",
    forcedEnv ?? env,
    "url:",
    `${baseUrl(forcedEnv ?? env)}${path}`,
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

export async function findCustomer({
  cpfCnpj,
  email,
  name,
}: {
  cpfCnpj?: string;
  email?: string;
  name?: string;
}) {
  if (cpfCnpj) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
    );
    return data?.data?.[0] ?? null;
  }
  if (email) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      `/customers?email=${encodeURIComponent(email)}`,
    );
    return data?.data?.[0] ?? null;
  }
  if (name) {
    const data = await asaasFetch<{ totalCount: number; data: any[] }>(
      `/customers?name=${encodeURIComponent(name)}`,
    );
    return data?.data?.[0] ?? null;
  }
  return null;
}

export async function createCustomer(c: AsaasCustomer) {
  return asaasFetch<any>(`/customers`, {
    method: "POST",
    body: JSON.stringify(c),
  });
}

export async function updateCustomer(id: string, c: Partial<AsaasCustomer>) {
  // a doc usa PUT para update de customers
  return asaasFetch<any>(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(c),
  });
}

/** Diff simples para update “enxuto” */
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
