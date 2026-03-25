// app/api/nfe/order/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
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

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id é obrigatório" },
        { status: 400 },
      );
    }

    const { data: companyUser, error: companyUserError } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyUserError || !companyUser?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para o usuário autenticado" },
        { status: 403 },
      );
    }

    const companyId = companyUser.company_id;

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

    const products = (items ?? []).map((item: any) => ({
      ...item.products,
      quantity: item.quantity,
      price: item.price,
    }));

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
  } catch (error: any) {
    console.error("[api/nfe/order] error:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao buscar pedido da NF-e" },
      { status: 500 },
    );
  }
}