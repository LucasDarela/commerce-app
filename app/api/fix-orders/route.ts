import { NextResponse } from "next/server";

// ⚠️ ROTA REMOVIDA POR SEGURANÇA
// Esta rota de manutenção não tinha autenticação e permitia que qualquer pessoa
// executasse operações de escrita (UPDATE) em pedidos de todas as empresas.
// Se precisar de manutenção no futuro, use migrations no Supabase Studio.

export async function GET() {
  return NextResponse.json({ error: "Rota removida." }, { status: 410 });
}
