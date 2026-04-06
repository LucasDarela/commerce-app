import { NextResponse } from "next/server";
import {
  ACTIVE_INVOICE_STATUSES,
  getAuthenticatedContext,
  normalizeState,
} from "../../_utils";
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice";
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";
import { buildInvoiceDataFromOrder } from "@/lib/focus-nfe/buildInvoiceDataFromOrder";

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

    const { supabase, companyId, user } = ctx;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        company_id,
        customer_id,
        customer,
        note_number
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
        state,
        emit_nf
      `)
      .eq("id", order.customer_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (customerErr) {
      return NextResponse.json(
        { error: customerErr.message },
        { status: 400 },
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (customer.emit_nf !== true) {
      return NextResponse.json(
        {
          error:
            "O cliente não está habilitado para emitir NF-e. Revise as informações de cadastro.",
        },
        { status: 422 },
      );
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select(`
        id,
        state
      `)
      .eq("id", companyId)
      .maybeSingle();

    if (companyErr) {
      return NextResponse.json({ error: companyErr.message }, { status: 400 });
    }

    if (!company?.state) {
      return NextResponse.json(
        { error: "A empresa não possui UF cadastrada." },
        { status: 422 },
      );
    }

    if (!customer.state) {
      return NextResponse.json(
        { error: "O cliente não possui UF cadastrada." },
        { status: 422 },
      );
    }

    const operationScope =
      normalizeState(company.state) === normalizeState(customer.state)
        ? "inside_state"
        : "outside_state";

    const { data: activeInvoice } = await supabase
      .from("invoices")
      .select("id, status, ref, numero, serie")
      .eq("company_id", companyId)
      .eq("order_id", orderId)
      .in("status", ACTIVE_INVOICE_STATUSES)
      .maybeSingle();

    if (activeInvoice) {
      return NextResponse.json(
        {
          error: "Já existe NF-e ativa para este pedido.",
          ref: activeInvoice.ref,
        },
        { status: 409 },
      );
    }

    const invoiceData = await buildInvoiceDataFromOrder({
      supabase,
      companyId,
      orderId,
      operationScope,
    });

    console.log("[mobile emit-nfe] invoiceData:", invoiceData);
    const parse = invoiceSchema.safeParse(invoiceData);
    if (!parse.success) {
      return NextResponse.json(
        {
          error: "Dados da nota inválidos",
          details: parse.error.format(),
        },
        { status: 422 },
      );
    }

    const toIso = (s?: string | null) => {
      if (!s) return new Date().toISOString();
      const d = new Date(s);
      return Number.isNaN(d.getTime())
        ? new Date().toISOString()
        : d.toISOString();
    };

    const dataEmissaoDb = toIso(invoiceData.data_emissao);

    const { data: previous } = await supabase
      .from("invoices")
      .select("id, numero, serie, ref, status, created_at")
      .eq("company_id", companyId)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1);

    const prev = previous?.[0];
    const isRetry =
      prev?.status === "nota_rejeitada" || prev?.status === "erro_autorizacao";

    invoiceData.serie = invoiceData.serie || prev?.serie || "1";

    if (!invoiceData.note_number && order.note_number) {
      invoiceData.note_number = order.note_number;
    }

    if (!invoiceData.note_number) {
      return NextResponse.json(
        { error: "note_number é obrigatório para emissão idempotente" },
        { status: 400 },
      );
    }

    const { data: dup } = await supabase
      .from("invoices")
      .select("id, status, ref, numero")
      .eq("company_id", companyId)
      .eq("serie", invoiceData.serie)
      .eq("note_number", invoiceData.note_number)
      .in("status", ACTIVE_INVOICE_STATUSES)
      .maybeSingle();

    if (dup) {
      return NextResponse.json(
        { error: "NF-e já emitida para este número/série.", ref: dup.ref },
        { status: 409 },
      );
    }

    const baseRef = `${invoiceData.note_number}`;

    invoiceData.ref =
      isRetry && prev?.ref ? prev.ref : `${baseRef}_s${invoiceData.serie}`;

    console.log("[mobile emit-nfe] ref gerada:", invoiceData.ref, {
      isRetry,
      order_id: orderId,
      note_number: invoiceData.note_number,
      companyId,
      userId: user?.id,
      operationScope,
    });

    if (isRetry && prev?.numero && Number(prev.numero) > 0) {
      (invoiceData as any).numero = Number(prev.numero);
    } else {
      delete (invoiceData as any).numero;
    }

    const numeroParaBanco =
      isRetry && prev?.numero && Number(prev.numero) > 0
        ? Number(prev.numero)
        : null;

    const result = await emitInvoice({
      companyId,
      invoiceData,
      supabaseClient: supabase,
    });

    const numeroDefinitivo = (result as any)?.raw?.numero ?? numeroParaBanco;

    if (isRetry && prev?.id) {
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          status: result.status,
          chave_nfe: result.chave || null,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
          ref: invoiceData.ref,
        })
        .eq("id", prev.id)
        .eq("company_id", companyId);

      if (updateErr) {
        console.error("❌ Erro ao atualizar invoice:", updateErr);
        return NextResponse.json(
          { error: "Emitida, mas falhou ao atualizar." },
          { status: 500 },
        );
      }
    } else {
      const { error: insertErr } = await supabase.from("invoices").insert([
        {
          company_id: companyId,
          order_id: orderId,
          note_number: invoiceData.note_number,
          numero: numeroDefinitivo,
          serie: invoiceData.serie,
          chave_nfe: result.chave || null,
          status: result.status,
          ref: invoiceData.ref,
          valor_total: invoiceData.valor_total,
          xml_url: result.xml_url || null,
          danfe_url: result.danfe_url || null,
          data_emissao: dataEmissaoDb,
          natureza_operacao: invoiceData.natureza_operacao,
          customer_name: invoiceData.nome_destinatario,
        },
      ]);

      if (insertErr) {
        console.error("⚠️ Erro ao inserir invoice:", insertErr);
        return NextResponse.json(
          {
            success: false,
            error: "NF-e emitida na Focus, mas houve erro ao salvar no banco.",
            details: insertErr.message,
          },
          { status: 500 },
        );
      }
    }

    const isAuth = (result.status || "").toLowerCase().includes("autorizad");

    if (isAuth && (!result.xml_url || !result.danfe_url)) {
      const res = await fetchInvoiceStatus({
        supabase,
        companyId,
        ref: result.ref,
        poll: 2,
        intervalMs: 1500,
      });

      if (!("error" in res) && res.data) {
        await supabase
          .from("invoices")
          .update({
            numero: res.data.numero ?? numeroDefinitivo,
            serie: res.data.serie ?? invoiceData.serie,
            chave_nfe: res.data.chave ?? result.chave ?? null,
            xml_url: res.data.xml_url ?? result.xml_url ?? null,
            danfe_url: res.data.danfe_url ?? result.danfe_url ?? null,
            data_emissao: res.data?.data_emissao
              ? toIso(res.data.data_emissao)
              : dataEmissaoDb,
            status: res.data.status ?? result.status,
          })
          .eq("ref", result.ref)
          .eq("company_id", companyId);

        result.xml_url = res.data.xml_url ?? result.xml_url;
        result.danfe_url = res.data.danfe_url ?? result.danfe_url;
      }
    }

    return NextResponse.json(
      {
        success: true,
        operationScope,
        result,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ mobile emit-nfe error:", err);

    const detalhes: Array<{ campo?: string; codigo?: any; mensagem?: string }> =
      Array.isArray(err?.erros)
        ? err.erros
        : Array.isArray(err?.focus?.erros)
          ? err.focus.erros
          : [];

    const readable = detalhes.map((d, i) => {
      const loc = d?.campo ? `(${d.campo})` : "";
      const cod = d?.codigo ? `[${d.codigo}]` : "";
      return `${i + 1}. ${cod} ${d?.mensagem ?? "Erro"} ${loc}`.trim();
    });

    return NextResponse.json(
      {
        error: err?.message || "Erro interno",
        status: err?.status || 500,
        detalhes,
        detalhes_texto: readable.join("\n"),
        focus: err?.focus || null,
      },
      { status: 500 },
    );
  }
}