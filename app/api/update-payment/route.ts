import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/components/types/supabase"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      order_id,
      total_payed,
      payment_method,
    }: {
      order_id: string
      total_payed: number
      payment_method?: string
    } = body

    if (!order_id || typeof total_payed !== "number") {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const supabase = createServerComponentClient<Database>({
      cookies, 
    });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, total_payed")
      .eq("id", order_id as any)
      .single()

      if (!order || "code" in order) {
      console.error("❌ Pedido não encontrado:", orderError)
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
    }
    const safeOrder = order as { id: string; total: number; total_payed: number | null };

    const oldPayed = Number(safeOrder.total_payed) || 0;
    const rawNewPayed = oldPayed + total_payed;
    const cappedPayed = Math.min(rawNewPayed, Number(safeOrder.total));
    
    const newStatus = cappedPayed >= Number(safeOrder.total) ? "Pago" : "Pendente";

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        total_payed: cappedPayed.toString(), // garante compatibilidade com numeric
        payment_status: newStatus,
        ...(payment_method && { payment_method }),
      })
      .eq("id", order_id)

    if (updateError) {
      console.error("❌ Erro ao atualizar pagamento:", updateError)
      return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total_payed,
      payment_status: newStatus,
    })
  } catch (err) {
    console.error("❌ Erro interno no pagamento:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}