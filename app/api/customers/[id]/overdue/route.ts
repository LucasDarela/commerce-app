// app/api/customers/[id]/overdue/route.ts
import { NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabaseServer"; // sua helper que usa service role ou usa RLS + company_id do JWT
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteSupabaseClient();

  // Descobre company_id do usuário atual (do JWT/claims, sua função atual)
  const { data: comp } = await supabase
    .from("current_user_company_id")
    .select("company_id")
    .maybeSingle();
  if (!comp?.company_id) {
    return NextResponse.json({ error: "no company" }, { status: 401 });
  }

  const customerId = params.id;

  const { data: hasOverdue, error: err1 } = await supabase.rpc(
    "customer_has_overdue_boleto",
    {
      p_company_id: comp.company_id,
      p_customer_id: customerId,
    },
  );
  if (err1) return NextResponse.json({ error: err1.message }, { status: 400 });

  let list: any[] = [];
  if (hasOverdue) {
    const { data, error } = await supabase.rpc("customer_overdue_boletos", {
      p_company_id: comp.company_id,
      p_customer_id: customerId,
    });
    if (!error && data) list = data;
  }

  return NextResponse.json({ hasOverdue: !!hasOverdue, items: list });
}
