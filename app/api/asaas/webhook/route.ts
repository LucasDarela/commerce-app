// app/api/asaas/webhook/route.ts
import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AsaasPayment = {
  id: string;
  value?: number;
  netValue?: number;
  originalValue?: number;
  status?: string;
};

type AsaasWebhook = {
  event?: string;
  payment?: AsaasPayment;
  data?: { payment?: AsaasPayment };
};

function normalizeAsaasStatus(status?: string) {
  return (status || "").toUpperCase();
}

function isPaidStatus(asaasStatus?: string) {
  const s = normalizeAsaasStatus(asaasStatus);

  return (
    s === "RECEIVED" ||
    s === "CONFIRMED" ||
    s === "RECEIVED_IN_CASH" ||
    s === "RECEIVED_IN_BANK"
  );
}

function isOverdueLikeStatus(asaasStatus?: string) {
  const s = normalizeAsaasStatus(asaasStatus);

  return (
    s === "OVERDUE" ||
    s === "PAYMENT_OVERDUE" ||
    s === "BANK_SLIP_CANCELLED" ||
    s === "PAYMENT_BANK_SLIP_CANCELLED"
  );
}

function mapAsaasToOrderPaymentStatus(
  asaasStatus?: string,
): "Paid" | "Unpaid" {
  return isPaidStatus(asaasStatus) ? "Paid" : "Unpaid";
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

  const rawToken = tokenHeader.replace(/^Bearer\s+/i, "").trim();

  const { data: integ, error: integErr } = await supabase
    .from("company_integrations")
    .select("company_id")
    .eq("provider", "asaas")
    .eq("webhook_token", rawToken)
    .maybeSingle();

  if (integErr || !integ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const companyId = integ.company_id;
  const asaasStatus = normalizeAsaasStatus(payment.status);
  const paymentStatus = mapAsaasToOrderPaymentStatus(payment.status);
  const paid = isPaidStatus(payment.status);
  const overdueLike = isOverdueLikeStatus(payment.status);

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, total, total_payed, note_number, customer_id, customer")
    .eq("company_id", companyId)
    .eq("boleto_id", payment.id)
    .maybeSingle();

  if (orderErr) {
    console.error("webhook asaas: erro ao buscar order:", orderErr);
  }

  if (!order) {
    return NextResponse.json({
      ok: true,
      company_id: companyId,
      event: body.event ?? null,
      payment_id: payment.id,
      warning: "order not found for boleto_id",
    });
  }

  const updateOrder: Record<string, any> = {
    payment_status: paymentStatus,
  };

  /**
   * REGRA CRÍTICA:
   * Só mexer em total_payed quando realmente houve pagamento.
   * Nunca atualizar total_payed em vencimento, cancelamento bancário,
   * expiração ou qualquer outro status não pago.
   */
  if (paid) {
    const orderTotal = Number(order.total ?? 0);
    const currentPaid = Number(order.total_payed ?? 0);

    // Preferimos value para o valor bruto pago pelo cliente.
    // netValue é líquido após taxas e NÃO deve ser usado para baixar o pedido.
    const paidValue =
      typeof payment.value === "number"
        ? Number(payment.value)
        : typeof payment.originalValue === "number"
          ? Number(payment.originalValue)
          : orderTotal;

    const nextPaid = Math.min(
      Math.max(currentPaid, paidValue),
      orderTotal > 0 ? orderTotal : paidValue,
    );

    updateOrder.total_payed = nextPaid;

    if (orderTotal > 0 && nextPaid >= orderTotal) {
      updateOrder.payment_status = "Paid";
    }
  }

  /**
   * Em vencimento/cancelamento do boleto bancário:
   * - mantém em aberto
   * - NÃO faz baixa
   * - NÃO altera total_payed
   */
  if (overdueLike) {
    updateOrder.payment_status = "Unpaid";
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update(updateOrder)
    .eq("company_id", companyId)
    .eq("id", order.id);

  if (updErr) {
    console.error("webhook asaas: erro ao atualizar orders:", updErr);
    return NextResponse.json(
      { error: "erro ao atualizar pedido" },
      { status: 500 },
    );
  }

  after(async () => {
    let customerName: string | null = order.customer ?? null;

    if (!customerName && order.customer_id) {
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("name, fantasy_name")
        .eq("company_id", companyId)
        .eq("id", order.customer_id)
        .maybeSingle();

      if (custErr) {
        console.error("Erro ao buscar cliente:", custErr);
      }

      customerName = customer?.fantasy_name || customer?.name || null;
    }

    const orderNumber = order.note_number ?? order.id ?? null;

    /**
     * Notificação:
     * só cria "Pagamento recebido" quando realmente recebeu.
     */
    if (paid) {
      const grossPaid =
        typeof payment.value === "number"
          ? Number(payment.value)
          : typeof payment.originalValue === "number"
            ? Number(payment.originalValue)
            : null;

      // Deduplicação: evita notificação duplicada para o mesmo pagamento
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("company_id", companyId)
        .eq("title", "Pagamento recebido")
        .ilike("description", `%Pedido #${orderNumber}%`)
        .gte("date", since)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const formattedValue =
          grossPaid != null
            ? new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(grossPaid)
            : "—";

        const title = "Pagamento recebido";
        const description =
          `Cobrança de ${customerName ?? "Cliente desconhecido"}` +
          (orderNumber ? ` - Pedido #${orderNumber}` : "") +
          ` - marcada como Paga | Valor: ${formattedValue}`;

        const { error: notifErr } = await supabase.from("notifications").insert({
          title,
          description,
          company_id: companyId,
          date: new Date().toISOString(),
          read: false,
        });

        if (notifErr) {
          console.error("❌ Falha ao inserir notificação:", notifErr);
        }
      }
    }

    if (overdueLike) {
      // Deduplicação: evita notificação duplicada para o mesmo boleto vencido
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("company_id", companyId)
        .eq("title", "Boleto vencido")
        .ilike("description", `%Pedido #${orderNumber}%`)
        .gte("date", since)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const statusLabel: Record<string, string> = {
          OVERDUE: "Boleto vencido sem pagamento",
          PAYMENT_OVERDUE: "Pagamento em atraso",
          BANK_SLIP_CANCELLED: "Boleto cancelado pelo banco",
          PAYMENT_BANK_SLIP_CANCELLED: "Boleto de pagamento cancelado",
        };
        const statusLine = statusLabel[asaasStatus] ?? `Status: ${asaasStatus}`;

        const title = "Boleto vencido";
        const description =
          `Cobrança de ${customerName ?? "Cliente desconhecido"}` +
          (orderNumber ? ` - Pedido #${orderNumber}` : "") +
          ` - permanece em aberto | ${statusLine}`;

        const { error: notifErr } = await supabase.from("notifications").insert({
          title,
          description,
          company_id: companyId,
          date: new Date().toISOString(),
          read: false,
        });

        if (notifErr) {
          console.error("❌ Falha ao inserir notificação de vencimento:", notifErr);
        }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    company_id: companyId,
    event: body.event ?? null,
    payment_id: payment.id,
    asaas_status: asaasStatus,
    status_applied: updateOrder.payment_status,
    total_payed_applied:
      typeof updateOrder.total_payed === "number"
        ? updateOrder.total_payed
        : null,
  });
}