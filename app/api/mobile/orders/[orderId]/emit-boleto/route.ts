import { NextResponse } from "next/server";
import { asaasFetch } from "@/lib/asaas";
import {
  getAuthenticatedContext,
  normalizePaymentMethod,
  parseDateToYmd,
  plusDays,
} from "../../_utils";
import { sendBoletoEmailIfReady } from "@/lib/asaas/sendBoletoEmail";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { orderId } = await params;

    const ctx = await getAuthenticatedContext(_);

    if (ctx.error) {
      return NextResponse.json(
        { error: ctx.error.error },
        { status: ctx.error.status },
      );
    }

    const { supabase, companyId } = ctx;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        company_id,
        customer_id,
        customer,
        note_number,
        payment_method,
        total,
        appointment_date,
        days_ticket,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number
      `)
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 400 });
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    if (normalizePaymentMethod(order.payment_method) !== "boleto") {
      return NextResponse.json(
        { error: "Esta venda não está configurada para boleto." },
        { status: 422 },
      );
    }

    if (order.boleto_id || order.boleto_url) {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          message: "Boleto já gerado para este pedido.",
          data: {
            boleto_id: order.boleto_id,
            boleto_url: order.boleto_url,
            boleto_digitable_line: order.boleto_digitable_line,
            boleto_barcode_number: order.boleto_barcode_number,
          },
        },
        { status: 200 },
      );
    }

    const { data: customer, error: cliErr } = await supabase
      .from("customers")
      .select(`
        id,
        company_id,
        name,
        asaas_customer_id
      `)
      .eq("id", order.customer_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (cliErr) {
      return NextResponse.json({ error: cliErr.message }, { status: 400 });
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!customer.asaas_customer_id) {
      return NextResponse.json(
        { error: "Cliente não sincronizado com o Asaas" },
        { status: 400 },
      );
    }

    const appointmentYmd = parseDateToYmd(order.appointment_date);
    if (!appointmentYmd) {
      return NextResponse.json(
        { error: "appointment_date inválida no pedido" },
        { status: 422 },
      );
    }

    const daysTicket = Number(order.days_ticket ?? 0);
    const dueDate = plusDays(appointmentYmd, daysTicket > 0 ? daysTicket : 12);

    const payload: Record<string, any> = {
      customer: customer.asaas_customer_id,
      billingType: "BOLETO",
      value: Number(order.total ?? 0),
      dueDate,
      description: `Pedido ${order.note_number || order.id} - ${order.customer || customer.name}`,
      postalService: false,
    };

    const created = await asaasFetch<any>(
      supabase,
      companyId,
      "/payments",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const boletoUrl = created.bankSlipUrl ?? created.invoiceUrl ?? null;

    let digitableLine: string | null =
      created.identificationField ?? created.digitableLine ?? null;

    let barcode: string | null =
      created.bankSlipBarcode ?? null;

    // O Asaas leva alguns segundos para processar o boleto antes de disponibilizar
    // o identificationField. Tentamos até 3x com delay crescente.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (digitableLine && barcode) break; // já temos os dados

      try {
        await sleep(RETRY_DELAY_MS);

        const identification = await asaasFetch<any>(
          supabase,
          companyId,
          `/payments/${created.id}/identificationField`,
          { method: "GET" },
        );

        const newLine =
          identification?.identificationField ??
          identification?.digitableLine ??
          null;

        const newBarcode =
          identification?.barCode ??
          identification?.barcode ??
          identification?.bankSlipBarcode ??
          null;

        if (newLine) digitableLine = newLine;
        if (newBarcode) barcode = newBarcode;

        console.log(`[emit-boleto] tentativa ${attempt}/${MAX_RETRIES}:`, {
          digitableLine,
          barcode,
        });
      } catch (err) {
        console.warn(
          `⚠️ [emit-boleto] tentativa ${attempt}/${MAX_RETRIES} - erro ao obter identificationField:`,
          err,
        );
      }
    }

    const update: Record<string, any> = {
      boleto_id: created.id,
      boleto_url: boletoUrl,
      boleto_digitable_line: digitableLine,
      boleto_barcode_number: barcode,
      boleto_expiration_date: dueDate,
      due_date: dueDate,
      issue_date: appointmentYmd,
      payment_status: "Unpaid",
    };

    const { error: updErr } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (updErr) {
      console.error("❌ Falha ao atualizar order com dados do boleto:", updErr);
      return NextResponse.json(
        {
          success: false,
          error: "Boleto gerado, mas houve falha ao salvar no banco.",
          details: updErr.message,
        },
        { status: 500 },
      );
    }

    // Envio automático de e-mail do boleto via Resend
    sendBoletoEmailIfReady(orderId, companyId, supabase).catch((err) =>
      console.error("[mobile/emit-boleto] Erro ao disparar email:", err),
    );

    return NextResponse.json(
      {
        success: true,
        message: "Boleto gerado com sucesso.",
        data: {
          order_id: orderId,
          asaasPaymentId: created.id,
          digitableLine,
          barcode,
          boletoUrl,
          expirationDate: dueDate,
          payment: created,
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ mobile emit-boleto - erro:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao criar boleto" },
      { status: 400 },
    );
  }
}