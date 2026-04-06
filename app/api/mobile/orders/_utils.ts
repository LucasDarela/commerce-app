import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedContext(req?: Request) {
  const supabase = await createServerSupabaseClient();
  let user = null;
  let userError = null;
  // 1. Tentar coletar token via cabeçalho HTTP (Mobile) se enviaram o req
  const authHeader = req?.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    user = authData?.user;
    userError = authErr;
  } else {
    // 2. Fallback pro comportamento de Cookies tradicional (Navegador/Painel Web)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    user = authData?.user;
    userError = authErr;
  }
  if (userError || !user) {
    return {
      supabase,
      error: { error: "Não autenticado", status: 401 },
      user: null,
      companyId: null,
    };
  }

  const { data: comp, error: compErr } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();

  if (compErr || !comp?.company_id) {
    return {
      supabase,
      error: { error: "company_id não encontrado", status: 403 },
      user,
      companyId: null,
    };
  }

  return {
    supabase,
    error: null,
    user,
    companyId: comp.company_id as string,
  };
}

export function normalizePaymentMethod(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function parseDateToYmd(value?: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

export function plusDays(ymd: string, days: number) {
  const base = new Date(`${ymd}T00:00:00`);
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function normalizeState(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

export const ACTIVE_INVOICE_STATUSES = [
  "processando_autorizacao",
  "autorizado",
  "autorizada",
  "cancelado",
  "cancelada",
];