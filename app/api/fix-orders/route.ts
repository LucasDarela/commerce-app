import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  
  // Buscar todas as rotas existentes
  const { data: routes } = await supabase.from('delivery_routes').select('route_number, company_id');
  
  // Buscar todos os pedidos que têm driver_id
  const { data: orders } = await supabase.from('orders').select('id, route_number, driver_id, company_id').not('driver_id', 'is', null);
  
  if (!orders) return NextResponse.json({ success: false });

  let fixedCount = 0;
  for (const order of orders) {
    const routeExists = routes?.some(r => r.route_number === order.route_number && r.company_id === order.company_id);
    if (!routeExists) {
      await supabase.from('orders').update({ driver_id: null, route_number: null }).eq('id', order.id);
      fixedCount++;
    }
  }

  return NextResponse.json({ success: true, fixedCount });
}
