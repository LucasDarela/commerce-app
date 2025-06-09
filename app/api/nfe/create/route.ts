// app/api/nfe/create/route.ts
import { NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice"
import { invoiceSchema } from "@/lib/focus-nfe/invoiceSchema"

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies })

  try {
    const body = await req.json()
    const { companyId, invoiceData } = body

    if (!companyId || !invoiceData) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const parseResult = invoiceSchema.safeParse(invoiceData)
    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados da nota inválidos", details: parseResult.error.format() }, { status: 422 })
    }

    const result = await emitInvoice({ companyId, invoiceData, supabaseClient: supabase })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Erro na emissão da nota:", err)
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 })
  }
}