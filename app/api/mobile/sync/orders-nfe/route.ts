import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import {
  ACTIVE_INVOICE_STATUSES,
  getAuthenticatedContext,
  normalizeState,
} from "../../_utils";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (ctx.error) {
      return NextResponse.json(
        { error: ctx.error.error },
        { status: ctx.error.status }
      );
    }
    const { supabase } = ctx;

    const body = await req.json();
    const orderIds: string[] = body.orderIds || [];

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    // 1. Fetch Orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, company_id, customer_id")
      .in("id", orderIds);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))];
    const companyIds = [...new Set(orders.map(o => o.company_id).filter(Boolean))];

    // 2. Fetch Customers & Companies
    const { data: customers } = await supabase
      .from("customers")
      .select("id, state")
      .in("id", customerIds);

    const { data: companies } = await supabase
      .from("companies")
      .select("id, state, regime_tributario")
      .in("id", companyIds);

    // 3. Fetch Active Invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, order_id, status, ref, numero, serie, danfe_url, xml_url, chave_nfe")
      .in("order_id", orderIds)
      .in("status", ACTIVE_INVOICE_STATUSES);

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    // 4. Fetch Order Items for the orders that actually have invoices
    const invoiceOrderIds = invoices.map(i => i.order_id);
    const { data: allOrderItems } = await supabase
      .from("order_items")
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        price,
        products (
          id,
          name,
          ncm,
          cfop,
          cst_icms,
          csosn_icms
        )
      `)
      .in("order_id", invoiceOrderIds);

    // 5. Fetch Fiscal Ops
    const { data: allFiscalOps } = await supabase
      .from("fiscal_operations")
      .select("*")
      .in("company_id", companyIds);

    // 6. Assemble the payload
    const result: Record<string, any> = {};

    for (const invoice of invoices) {
      const orderId = invoice.order_id;
      const order = orders.find(o => o.id === orderId);
      if (!order) continue;

      const customer = customers?.find(c => c.id === order.customer_id);
      const company = companies?.find(c => c.id === order.company_id);
      const fiscalOps = allFiscalOps?.filter(f => f.company_id === order.company_id) || [];
      const orderItems = allOrderItems?.filter(oi => oi.order_id === orderId) || [];

      let operationScope: "inside_state" | "outside_state" | "export" = "inside_state";
      if (company && customer) {
        const compState = normalizeState(company.state);
        const custState = normalizeState(customer.state);
        if (custState === "EX") operationScope = "export";
        else if (compState !== custState) operationScope = "outside_state";
      }

      const itemsList = orderItems.map((it) => {
        const product = Array.isArray(it.products) ? it.products[0] : it.products;
        const operacaoFiscal = fiscalOps.length ? fiscalOps[0] : null;
        
        const isSimples = company?.regime_tributario === "simples_nacional";
        const cstFromOp = isSimples ? operacaoFiscal?.csosn_icms : operacaoFiscal?.cst_icms;

        return {
          id: it.product_id,
          name: product?.name || "Produto sem nome",
          quantity: it.quantity,
          price: it.price,
          ncm: product?.ncm ? String(product.ncm).replace(/\D/g, "") : null,
          cfop: product?.cfop || null,
          cst_icms: cstFromOp || product?.cst_icms || product?.csosn_icms || null
        };
      });

      let totalBc = 0;
      let totalIcms = 0;
      const operacaoFiscal = fiscalOps.length ? fiscalOps[0] : null;

      for (const it of orderItems) {
        const isSimples = company?.regime_tributario === "simples_nacional";
        const icmsItem = String(
          (isSimples ? operacaoFiscal?.csosn_icms : operacaoFiscal?.cst_icms) ?? ""
        ).trim();
        
        if (!isSimples && icmsItem !== "60" && icmsItem !== "40" && icmsItem !== "41") {
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          const aliq = Number(operacaoFiscal?.aliquota_icms || 17);
          totalBc += (price * qty);
          totalIcms += (price * qty * aliq) / 100;
        }
      }

      result[orderId] = {
        ...invoice,
        items: itemsList,
        cst_icms: itemsList.length > 0 ? itemsList[0].cst_icms : null,
        taxes: { base_calculo: totalBc, valor_icms: totalIcms }
      };
    }

    return NextResponse.json({ data: result }, { status: 200 });

  } catch (err: any) {
    console.error("❌ mobile bulk sync nfe error:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno" },
      { status: 500 }
    );
  }
}
