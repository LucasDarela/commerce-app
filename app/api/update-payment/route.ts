import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      order_id,
      total_payed,
      payment_method,
    }: {
      order_id: string;
      total_payed: number;
      payment_method?: string;
    } = body;

    if (!order_id || typeof total_payed !== "number") {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 },
      );
    }

    const supabase = await createRouteSupabaseClient();

    // ── Autenticação ──────────────────────────────────────────────────────────
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ── Obter empresa do usuário logado ───────────────────────────────────────
    const { data: companyUser, error: compErr } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (compErr || !companyUser?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para o usuário" },
        { status: 403 },
      );
    }

    const companyId = companyUser.company_id;

    // ── Buscar pedido verificando que pertence à empresa do usuário (anti-IDOR) ─
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, total_payed, company_id")
      .eq("id", order_id)
      .eq("company_id", companyId) // garante que o pedido é desta empresa
      .single();

    if (!order || orderError) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    const safeOrder = order as {
      id: string;
      total: number;
      total_payed: number | null;
    };

    const oldPayed = Number(safeOrder.total_payed) || 0;
    const rawNewPayed = oldPayed + total_payed;
    const cappedPayed = Math.min(rawNewPayed, Number(safeOrder.total));

    const isFullyPaid = cappedPayed >= Number(safeOrder.total) - 0.01;
    let newStatus = "Unpaid";
    if (isFullyPaid) {
      newStatus = "Paid";
    } else if (cappedPayed > 0) {
      newStatus = "Partial";
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        total_payed: cappedPayed,
        payment_status: newStatus,
        ...(payment_method && { payment_method }),
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("❌ Erro ao atualizar pagamento:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar pagamento" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      total_payed,
      payment_status: newStatus,
    });
  } catch (err) {
    console.error("❌ Erro interno no pagamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
