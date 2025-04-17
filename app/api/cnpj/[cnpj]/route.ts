// app/api/cnpj/[cnpj]/route.ts
import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const cnpj = segments[segments.length - 1]
  
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
    }
  
    try {
      // Primeira tentativa: BrasilAPI
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      return NextResponse.json(data)
    } catch (brasilApiError) {
      console.warn("BrasilAPI falhou, tentando Receitaws...")
  
      try {
        // Fallback: Receitaws
        const { data } = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        })
        return NextResponse.json(data)
      } catch (fallbackError) {
        console.error("Erro nas duas APIs:", fallbackError)
        return NextResponse.json({ error: "Erro ao buscar CNPJ nas APIs" }, { status: 502 })
      }
    }
  }