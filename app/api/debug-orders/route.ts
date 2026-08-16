import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

// ⚠️ ROTA REMOVIDA POR SEGURANÇA
// Esta rota de debug não tinha autenticação e expunha dados de delivery_routes
// de todas as empresas para qualquer pessoa com acesso à URL.
// Se precisar de debug no futuro, use o Supabase Studio diretamente.

export async function GET() {
  return NextResponse.json({ error: "Rota removida." }, { status: 410 });
}
