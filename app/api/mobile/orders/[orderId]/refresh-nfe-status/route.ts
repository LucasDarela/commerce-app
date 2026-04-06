// app/api/mobile/orders/[orderId]/refresh-nfe-status/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";

type Params = {
  params: Promise<{ orderId: string }>;
};

function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select(`
        id,
        order_id,
        company_id,
        numero,
        serie,
        chave_nfe,
        status,
        ref,
        valor_total,
        xml_url,
        danfe_url,
        data_emissao,
        created_at,
        customer_name,
        natureza_operacao,
        note_number
      `)
      .eq("order_id", orderId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceErr) {
      return NextResponse.json(
        { error: invoiceErr.message },
        { status: 400 },
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Nenhuma NF-e encontrada para este pedido." },
        { status: 404 },
      );
    }

    if (!invoice.ref) {
      return NextResponse.json(
        { error: "A invoice não possui ref para consulta na Focus." },
        { status: 422 },
      );
    }

    const res = await fetchInvoiceStatus({
      supabase,
      companyId,
      ref: invoice.ref,
      poll: 2,
      intervalMs: 1500,
    });

    if ("error" in res) {
      return NextResponse.json(
        {
          error: res.error || "Erro ao consultar status da NF-e",
        },
        { status: 400 },
      );
    }

    const data = res.data;

    if (!data) {
      return NextResponse.json(
        {
          error: "Não foi possível obter os dados atualizados da NF-e.",
        },
        { status: 404 },
      );
    }

    const updatePayload = {
      numero: data.numero ?? invoice.numero ?? null,
      serie: data.serie ?? invoice.serie ?? null,
      chave_nfe: data.chave ?? invoice.chave_nfe ?? null,
      xml_url: data.xml_url ?? invoice.xml_url ?? null,
      danfe_url: data.danfe_url ?? invoice.danfe_url ?? null,
      data_emissao: data.data_emissao
        ? toIso(data.data_emissao)
        : invoice.data_emissao ?? null,
      status: data.status ?? invoice.status ?? null,
    };

    const { error: updErr } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoice.id)
      .eq("company_id", companyId);

    if (updErr) {
      return NextResponse.json(
        {
          error: "Status consultado, mas falhou ao atualizar a invoice.",
          details: updErr.message,
        },
        { status: 500 },
      );
    }

    const { data: updatedInvoice, error: updatedErr } = await supabase
      .from("invoices")
      .select(`
        id,
        order_id,
        company_id,
        numero,
        serie,
        chave_nfe,
        status,
        ref,
        valor_total,
        xml_url,
        danfe_url,
        data_emissao,
        created_at,
        customer_name,
        natureza_operacao,
        note_number
      `)
      .eq("id", invoice.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (updatedErr) {
      return NextResponse.json(
        {
          error: "Invoice atualizada, mas falhou ao reler os dados.",
          details: updatedErr.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Status da NF-e atualizado com sucesso.",
        data: updatedInvoice,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ mobile refresh-nfe-status error:", err);

    return NextResponse.json(
      {
        error: err?.message || "Erro interno ao atualizar status da NF-e",
      },
      { status: 500 },
    );
  }
}