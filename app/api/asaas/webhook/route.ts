import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚙️ configure no .env
// SUPABASE_URL=...
// SUPABASE_SERVICE_ROLE_KEY=...
// ASAAS_WEBHOOK_TOKEN=algum_token_unico

type AsaasPayment = {
  id: string;
  value?: number;
  netValue?: number;
  status?: string; // PENDING, RECEIVED, CONFIRMED, REFUNDED, OVERDUE, etc.
  // ...outros campos do Asaas
};

type AsaasWebhook = {
  event?: string;
  payment?: AsaasPayment;
  data?: { payment?: AsaasPayment }; // alguns formatos embalam em data.payment
};

function mapAsaasToFRStatus(asaasStatus?: string): "Paid" | "Unpaid" {
  switch ((asaasStatus || "").toUpperCase()) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
    case "RECEIVED_IN_BANK":
    case "REFUNDED": // escolha: manter como Paid; ajuste se quiser outro estado
      return "Paid";
    case "PENDING":
    case "OVERDUE":
    case "CANCELLED":
    case "DELETED":
    default:
      return "Unpaid";
  }
}

export async function POST(req: Request) {
  // 1) valida segredo do webhook
  const tokenHeader =
    req.headers.get("asaas-access-token") ||
    req.headers.get("x-asaas-access-token"); // fallback se configurar com outro nome
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || tokenHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) parse body
  let body: AsaasWebhook;
  try {
    body = (await req.json()) as AsaasWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = body.event || "";
  const payment: AsaasPayment =
    body.payment || body.data?.payment || ({} as AsaasPayment);

  if (!payment?.id) {
    return NextResponse.json({ error: "payment id missing" }, { status: 400 });
  }

  // 3) prepara supabase (service role - ignora RLS com segurança)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 4) mapeia status e valores
  const status = mapAsaasToFRStatus(payment.status);
  const totalPayed =
    typeof payment.netValue === "number"
      ? payment.netValue
      : typeof payment.value === "number"
        ? payment.value
        : null;

  // 5) atualiza financial_records pelo invoice_number
  //    (opcional: também pode filtrar company_id se você guardar em metadados)
  const updatePayload: Record<string, any> = {
    status,
  };
  if (totalPayed !== null) {
    updatePayload.total_payed = totalPayed;
  }

  const { error: updErr } = await supabase
    .from("financial_records")
    .update(updatePayload)
    .eq("invoice_number", payment.id);

  if (updErr) {
    console.error(
      "❌ webhook asaas: erro ao atualizar financial_records:",
      updErr.message,
    );
    // ainda responde 200 pra não re-tentar infinito, mas loga para investigar
  }

  // 6) resposta
  return NextResponse.json({
    ok: true,
    event,
    invoice_number: payment.id,
    status_applied: status,
    total_payed: totalPayed,
  });
}
