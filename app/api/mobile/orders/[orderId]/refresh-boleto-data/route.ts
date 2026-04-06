// app/api/mobile/orders/[orderId]/refresh-boleto-data/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asaasFetch } from "@/lib/asaas";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { orderId } = await params;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    const { data: comp, error: compErr } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (compErr || !comp?.company_id) {
      return NextResponse.json(
        { error: "company_id não encontrado" },
        { status: 403 },
      );
    }

    const companyId = comp.company_id;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        company_id,
        note_number,
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
      return NextResponse.json(
        { error: orderErr.message },
        { status: 400 },
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    if (!order.boleto_id) {
      return NextResponse.json(
        { error: "Este pedido ainda não possui boleto gerado." },
        { status: 422 },
      );
    }

    const payment = await asaasFetch<any>(
      supabase,
      companyId,
      `/payments/${order.boleto_id}`,
      { method: "GET" },
    );

    let digitableLine: string | null = null;
    let barcode: string | null = null;

    try {
      const identification = await asaasFetch<any>(
        supabase,
        companyId,
        `/payments/${order.boleto_id}/identificationField`,
        { method: "GET" },
      );

      digitableLine =
        identification?.identificationField ??
        identification?.digitableLine ??
        null;

      barcode =
        identification?.barCode ??
        identification?.barcode ??
        identification?.bankSlipBarcode ??
        null;
    } catch (idErr: any) {
      console.warn(
        "⚠️ Não foi possível obter linha digitável/código de barras:",
        idErr?.message || idErr,
      );
    }

    const boletoUrl =
      payment?.bankSlipUrl ??
      payment?.invoiceUrl ??
      order.boleto_url ??
      null;

    const expirationDate =
      payment?.dueDate ??
      order.boleto_expiration_date ??
      null;

    const updatePayload: Record<string, any> = {
      boleto_url: boletoUrl,
      boleto_digitable_line: digitableLine,
      boleto_barcode_number: barcode,
      boleto_expiration_date: expirationDate,
    };

    const { error: updErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (updErr) {
      return NextResponse.json(
        {
          error: "Boleto consultado, mas falhou ao atualizar o pedido.",
          details: updErr.message,
        },
        { status: 500 },
      );
    }

    const { data: updatedOrder, error: updatedErr } = await supabase
      .from("orders")
      .select(`
        id,
        note_number,
        boleto_id,
        boleto_url,
        boleto_digitable_line,
        boleto_barcode_number,
        boleto_expiration_date
      `)
      .eq("id", orderId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (updatedErr) {
      return NextResponse.json(
        {
          error: "Pedido atualizado, mas falhou ao reler os dados.",
          details: updatedErr.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Dados do boleto atualizados com sucesso.",
        data: {
          order: updatedOrder,
          payment: {
            id: payment?.id ?? order.boleto_id,
            status: payment?.status ?? null,
            dueDate: payment?.dueDate ?? null,
            bankSlipUrl: payment?.bankSlipUrl ?? null,
            invoiceUrl: payment?.invoiceUrl ?? null,
          },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ mobile refresh-boleto-data error:", err);

    return NextResponse.json(
      {
        error: err?.message || "Erro interno ao atualizar dados do boleto",
      },
      { status: 500 },
    );
  }
}