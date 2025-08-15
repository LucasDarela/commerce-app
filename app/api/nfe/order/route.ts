// app/api/nfe/order/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");
  const companyId = searchParams.get("company_id");

  if (!orderId || !companyId) {
    return NextResponse.json(
      { error: "order_id e company_id são obrigatórios" },
      { status: 400 },
    );
  }

  // Pedido + cliente
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, customers(*)")
    .eq("id", orderId)
    .eq("company_id", companyId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "Pedido não encontrado para esta empresa", details: orderErr },
      { status: 404 },
    );
  }

  // Itens + produtos
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*, products(*)")
    .eq("order_id", orderId);

  if (itemsErr) {
    return NextResponse.json(
      { error: "Erro ao buscar itens", details: itemsErr },
      { status: 500 },
    );
  }

  // Operações fiscais
  const { data: ops, error: opsErr } = await supabase
    .from("fiscal_operations")
    .select("*")
    .eq("company_id", companyId);

  if (opsErr) {
    return NextResponse.json(
      { error: "Erro ao buscar operações fiscais", details: opsErr },
      { status: 500 },
    );
  }

  // Emissor
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (companyErr || !company) {
    return NextResponse.json(
      { error: "Emissor não encontrado", details: companyErr },
      { status: 404 },
    );
  }

  const products = (items ?? []).map((i: any) => ({
    ...i.products,
    quantity: i.quantity,
    price: i.price,
  }));

  // ordenar operações (mesmo critério que você usa)
  const operations = (ops ?? []).sort(
    (a: any, b: any) => a.operation_id - b.operation_id,
  );

  return NextResponse.json({
    order,
    customer: order.customers,
    products,
    operations,
    emissor: company,
  });
}
