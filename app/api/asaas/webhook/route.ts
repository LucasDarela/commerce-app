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
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("x-asaas-access-token") ||
    req.headers.get("authorization");

  if (!tokenHeader) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

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

  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json({ error: "server env missing" }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // resolve empresa pelo token do webhook
  const { data: integ, error } = await supabase
    .from("company_integrations")
    .select("company_id")
    .eq("provider", "asaas")
    .eq("webhook_token", tokenHeader.trim())
    .maybeSingle();

  if (error || !integ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const companyId = integ.company_id;
  const status = mapAsaasToFRStatus(payment.status);
  const totalPayed =
    typeof payment.netValue === "number"
      ? payment.netValue
      : typeof payment.value === "number"
        ? payment.value
        : null;

  const updateOrder: Record<string, any> = { payment_status: status };
  if (totalPayed !== null) updateOrder.total_payed = totalPayed;

  const { error: updErr } = await supabase
    .from("orders")
    .update(updateOrder)
    .eq("company_id", companyId)
    .eq("boleto_id", payment.id);

  if (updErr) {
    console.error("webhook asaas: erro ao atualizar orders:", updErr);
    // seguimos criando notificação mesmo assim
  }

  // 🔔 inserir notificação (use só colunas que EXISTEM na sua tabela)
  // sua página busca: id, title, description, date, read
  const title = "Pagamento recebido (Asaas)";
  const description = `Cobrança ${payment.id} marcada como PAGA. Valor líquido: R$ ${
    totalPayed != null ? Number(totalPayed).toFixed(2) : "—"
  }`;

  const notifPayload: any = {
    title,
    description,
    // se sua tabela tiver company_id e for NOT NULL, inclua:
    company_id: companyId,
    // se sua coluna "date" tem default, pode omitir; senão use:
    date: new Date().toISOString(),
    read: false,
  };

  const { error: notifErr } = await supabase
    .from("notifications")
    .insert(notifPayload);

  if (notifErr) {
    console.error("❌ Falha ao inserir notificação:", notifErr);
  }

  return NextResponse.json({
    ok: true,
    company_id: companyId,
    event: body.event ?? null,
    payment_id: payment.id,
    status_applied: status,
    total_payed: totalPayed,
  });
}
