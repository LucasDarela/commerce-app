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

  if (!tokenHeader)
    return NextResponse.json({ error: "missing token" }, { status: 401 });

  let body: AsaasWebhook;
  try {
    body = (await req.json()) as AsaasWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payment: AsaasPayment =
    body.payment || body.data?.payment || ({} as AsaasPayment);
  if (!payment?.id)
    return NextResponse.json({ error: "payment id missing" }, { status: 400 });

  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE)
    return NextResponse.json({ error: "server env missing" }, { status: 500 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // resolve empresa pelo token do webhook
  const { data: integ, error: integErr } = await supabase
    .from("company_integrations")
    .select("company_id")
    .eq("provider", "asaas")
    .eq("webhook_token", tokenHeader.trim())
    .maybeSingle();

  if (integErr || !integ)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const companyId = integ.company_id;
  // ...
  const status = mapAsaasToFRStatus(payment.status);
  const isPaid = status === "Paid";
  const totalPayed =
    typeof payment.netValue === "number"
      ? payment.netValue
      : typeof payment.value === "number"
        ? payment.value
        : null;

  // Atualiza pedido (se houver match)
  const updateOrder: Record<string, any> = { payment_status: status };

  if (isPaid) {
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("id, total, total_payed")
      .eq("company_id", companyId)
      .eq("boleto_id", payment.id)
      .maybeSingle();

    if (!orderErr && orderRow) {
      const alreadyClosed =
        Number(orderRow.total_payed ?? 0) >= Number(orderRow.total ?? 0);

      if (!alreadyClosed) {
        updateOrder.total_payed = orderRow.total;
      }
    }
  } else if (totalPayed !== null) {
    updateOrder.total_payed = totalPayed;
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update(updateOrder)
    .eq("company_id", companyId)
    .eq("boleto_id", payment.id);

  if (updErr) {
    console.error("webhook asaas: erro ao atualizar orders:", updErr);
  }

  // 1) tenta achar o pedido pela cobrança (boleto_id)
  const { data: order } = await supabase
    .from("orders")
    .select("id, number, customer_id")
    .eq("company_id", companyId)
    .eq("boleto_id", payment.id)
    .maybeSingle();

  // 2) se achou o pedido, busca o nome do cliente
  let customerName: string | null = null;
  if (order?.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("company_id", companyId)
      .eq("id", order.customer_id)
      .maybeSingle();
    customerName = customer?.name ?? null;
  }

  const orderNumber = order?.number ?? order?.id ?? null;

  // 🔔 montar texto rico (sem alterar schema/colunas)
  const title = "Pagamento recebido";
  const header =
    `Cobrança ` +
    `(${customerName ?? "Cliente desconhecido"})` +
    (orderNumber ? ` - Pedido #${orderNumber}` : "") +
    ` - marcada como Paga`;
  const valueLine = `Valor líquido: R$ ${totalPayed != null ? Number(totalPayed).toFixed(2) : "—"}`;
  const description = `${header}\n${valueLine}`;

  const notifPayload: any = {
    title,
    description, // sua UI já mostra em múltiplas linhas; \n quebra a linha
    company_id: companyId,
    date: new Date().toISOString(),
    read: false,
  };

  const { error: notifErr } = await supabase
    .from("notifications")
    .insert(notifPayload);
  if (notifErr) console.error("❌ Falha ao inserir notificação:", notifErr);

  return NextResponse.json({
    ok: true,
    company_id: companyId,
    event: body.event ?? null,
    payment_id: payment.id,
    status_applied: status,
    total_payed: totalPayed,
  });
}
