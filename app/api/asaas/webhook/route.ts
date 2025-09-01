// app/api/asaas/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AsaasPayment = {
  id: string;
  value?: number;
  netValue?: number;
  status?: string;
};
type AsaasWebhook = {
  event?: string;
  payment?: AsaasPayment;
  data?: { payment?: AsaasPayment };
};

function mapAsaasToFRStatus(asaasStatus?: string): "Paid" | "Unpaid" {
  switch ((asaasStatus || "").toUpperCase()) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
    case "RECEIVED_IN_BANK":
      return "Paid";
    default:
      return "Unpaid";
  }
}

export async function POST(req: Request) {
  // 0) token enviado pelo Asaas
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("x-asaas-access-token") ||
    req.headers.get("authorization"); // fallback opcional

  if (!tokenHeader) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  // 1) parse do body
  let body: AsaasWebhook;
  try {
    body = (await req.json()) as AsaasWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payment: AsaasPayment =
    body.payment || body.data?.payment || ({} as AsaasPayment);
  if (!payment?.id) {
    return NextResponse.json({ error: "payment id missing" }, { status: 400 });
  }

  // 2) conecta Supabase com Service Role (server-only)
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json({ error: "server env missing" }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 3) resolve a empresa pelo webhook_token
  const { data: integ, error } = await supabase
    .from("company_integrations")
    .select("company_id, provider, webhook_token")
    .eq("provider", "asaas")
    .eq("webhook_token", tokenHeader.trim())
    .maybeSingle();

  if (error || !integ) {
    // token não corresponde a nenhuma empresa
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 4) mapeia status e atualiza os pedidos dessa empresa
  const status = mapAsaasToFRStatus(payment.status);
  const totalPayed =
    typeof payment.netValue === "number"
      ? payment.netValue
      : typeof payment.value === "number"
        ? payment.value
        : null;

  const updateOrder: Record<string, any> = {
    payment_status: status, // "Paid" | "Unpaid"
  };
  if (totalPayed !== null) updateOrder.total_payed = totalPayed;

  const { error: updErr } = await supabase
    .from("orders")
    .update(updateOrder)
    .eq("company_id", integ.company_id) // garante multi-tenant
    .eq("boleto_id", payment.id);

  if (updErr) {
    console.error("webhook asaas: erro ao atualizar orders:", updErr);
    // ainda retornamos 200 para o Asaas não re-tentar indefinidamente
  }

  return NextResponse.json({
    ok: true,
    company_id: integ.company_id,
    event: body.event ?? null,
    payment_id: payment.id,
    status_applied: status,
    total_payed: totalPayed,
  });
}
