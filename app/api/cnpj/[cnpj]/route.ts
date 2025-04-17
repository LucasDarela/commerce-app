// app/api/cnpj/[cnpj]/route.ts
import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function GET(
  req: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const { cnpj } = params

  if (!cnpj || cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
  }

  try {
    const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
    return NextResponse.json(data)
  } catch (brasilApiError) {
    try {
      const { data } = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      })

      return NextResponse.json(data)
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Erro ao buscar CNPJ nas APIs" },
        { status: 502 }
      )
    }
  }
}