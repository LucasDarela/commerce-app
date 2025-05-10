// app/api/update-financial-payment/route.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { financial_id, payment_method } = body

  if (!financial_id || !payment_method) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const supabase = createServerComponentClient({ cookies })

  const { error } = await supabase
    .from("financial_records")
    .update({
      status: "Paid",
      payment_method,
    })
    .eq("id", financial_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}