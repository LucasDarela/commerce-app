import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cnpj = searchParams.get("cnpj");

  if (!cnpj) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    // Tenta consultar na BrasilAPI
    const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    return NextResponse.json(data);
  } catch (brasilApiError) {
    console.warn("BrasilAPI falhou. Tentando fallback com Receitaws...");

    try {
      // Fallback: tenta consultar na Receitaws (requer CORS liberado)
      const { data } = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
        headers: {
          // Importante para evitar bloqueio de User-Agent
          "User-Agent": "Mozilla/5.0",
        },
      });

      return NextResponse.json(data);
    } catch (fallbackError) {
      console.error("Erro em ambas APIs (BrasilAPI e Receitaws):", fallbackError);
      return NextResponse.json({ error: "Erro ao buscar CNPJ nas APIs" }, { status: 502 });
    }
  }
}