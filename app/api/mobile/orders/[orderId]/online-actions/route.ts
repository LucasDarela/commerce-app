import { NextResponse } from "next/server";
import {
  ACTIVE_INVOICE_STATUSES,
  getAuthenticatedContext,
  normalizePaymentMethod,
  normalizeState,
} from "../../_utils";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_: Request, { params }: Params) {
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
        payment_status,
        total,
        days_ticket,
        appointment_date,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number,
        boleto_expiration_date
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

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select(`
        id,
        company_id,
        name,
        type,
        document,
        phone,
        email,
        city,
        state,
        emit_nf,
        asaas_customer_id
      `)
      .eq("id", order.customer_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (customerErr) {
      return NextResponse.json({ error: customerErr.message }, { status: 400 });
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        corporate_name,
        trade_name,
        document,
        city,
        state,
        state_registration,
        regime_tributario
      `)
      .eq("id", companyId)
      .maybeSingle();

    if (companyErr) {
      return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    const { data: activeInvoice } = await supabase
      .from("invoices")
      .select("id, status, ref, numero, serie, danfe_url, xml_url")
      .eq("company_id", companyId)
      .eq("order_id", orderId)
      .in("status", ACTIVE_INVOICE_STATUSES)
      .maybeSingle();

    const paymentMethod = normalizePaymentMethod(order.payment_method);
    const canEmitBoleto = paymentMethod === "boleto";

    const boletoAlreadyGenerated =
      !!order.boleto_id ||
      !!order.boleto_url ||
      !!order.boleto_digitable_line ||
      !!order.boleto_barcode_number;

    const canEmitNfe = customer?.emit_nf === true;

    const companyState = normalizeState(company?.state);
    const customerState = normalizeState(customer?.state);

    const operationScope =
      companyState && customerState
        ? companyState === customerState
          ? "inside_state"
          : "outside_state"
        : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          order: {
            id: order.id,
            note_number: order.note_number,
            customer_id: order.customer_id,
            customer_name: order.customer,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            total: order.total,
            appointment_date: order.appointment_date,
            days_ticket: order.days_ticket,
          },
          customer: customer
            ? {
                id: customer.id,
                name: customer.name,
                type: customer.type,
                document: customer.document,
                phone: customer.phone,
                email: customer.email,
                city: customer.city,
                state: customer.state,
                emit_nf: customer.emit_nf,
                asaas_customer_id: customer.asaas_customer_id,
              }
            : null,
          company: company
            ? {
                id: company.id,
                name: company.name,
                corporate_name: company.corporate_name,
                trade_name: company.trade_name,
                document: company.document,
                city: company.city,
                state: company.state,
                state_registration: company.state_registration,
                regime_tributario: company.regime_tributario,
              }
            : null,
          boleto: {
            can_emit: canEmitBoleto,
            already_generated: boletoAlreadyGenerated,
            reason: canEmitBoleto
              ? null
              : "Esta venda não está configurada para boleto.",
            current: {
              boleto_id: order.boleto_id,
              boleto_url: order.boleto_url,
              boleto_digitable_line: order.boleto_digitable_line,
              boleto_barcode_number: order.boleto_barcode_number,
              boleto_expiration_date: order.boleto_expiration_date,
            },
          },
          nfe: {
            can_emit: canEmitNfe,
            already_generated: !!activeInvoice,
            reason: canEmitNfe
              ? null
              : "O cliente não está habilitado para emitir NF-e. Revise as informações de cadastro.",
            operation_scope: operationScope,
            current: activeInvoice ?? null,
          },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ mobile online-actions error:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno" },
      { status: 500 },
    );
  }
}