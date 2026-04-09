// app/api/asaas/customers/[id]/overdue/route.ts
import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createRouteSupabaseClient();

    // 1. Obter Company ID do usuário autenticado
    const { data: comp } = await supabase
      .from("current_user_company_id")
      .select("company_id")
      .maybeSingle();

    if (!comp?.company_id) {
      return NextResponse.json({ error: "Empresa não autenticada" }, { status: 401 });
    }

    const customerId = params.id;

    // 2. Verificar se existem boletos vencidos via RPC do banco
    const { data: hasOverdue, error: err1 } = await supabase.rpc(
      "customer_has_overdue_boleto",
      {
        p_company_id: comp.company_id,
        p_customer_id: customerId,
      },
    );

    if (err1) {
      console.error("[Asaas/Overdue] Erro na verificação:", err1.message);
      return NextResponse.json({ error: err1.message }, { status: 400 });
    }

    let list: any[] = [];
    if (hasOverdue) {
      // 3. Buscar os detalhes dos boletos vencidos
      const { data, error } = await supabase.rpc("customer_overdue_boletos", {
        p_company_id: comp.company_id,
        p_customer_id: customerId,
      });
      if (!error && data) {
        list = data;
      }
    }

    return NextResponse.json({ 
      hasOverdue: !!hasOverdue, 
      items: list,
      customerId,
      processedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[Asaas/Overdue] Erro crítico:", err);
    return NextResponse.json({ error: "Erro interno ao consultar pendências" }, { status: 500 });
  }
}
