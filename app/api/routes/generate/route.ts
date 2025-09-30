import { NextResponse } from "next/server";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
  const supabase = createClientComponentClient();

  const body = await request.json();
  const { deliveryIds, driverId, date, type } = body;

  if (!deliveryIds?.length || !driverId || !date || !type) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // 1️⃣ Descobre o próximo número de rota do dia
  const { data: lastRoute } = await supabase
    .from("orders")
    .select("route_number")
    .eq("appointment_date", date)
    .order("route_number", { ascending: false })
    .limit(1)
    .single();

  const nextRouteNumber = lastRoute?.route_number
    ? lastRoute.route_number + 1
    : 1;

  // 2️⃣ Atualiza as orders selecionadas
  const { error } = await supabase
    .from("orders")
    .update({
      driver_id: driverId,
      route_number: nextRouteNumber,
      delivery_status: type,
    })
    .in("id", deliveryIds);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // 3️⃣ Retorna a rota gerada
  return NextResponse.json({ success: true, routeNumber: nextRouteNumber });
}
