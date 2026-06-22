import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function POST(request: Request) {
  const supabase = getAdminClient();

  const body = await request.json();
  const { deliveryIds, driverId, date, type, stops, companyId } = body;

  if (!deliveryIds?.length || !driverId || !date || !type || !stops || !companyId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // 1️⃣ Descobre o próximo número de rota do dia
  const { data: lastRoute } = await supabase
    .from("delivery_routes")
    .select("route_number")
    .eq("company_id", companyId)
    .eq("date", date)
    .order("route_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRouteNumber = lastRoute?.route_number ? lastRoute.route_number + 1 : 1;

  // 2️⃣ Cria o registro na tabela delivery_routes
  const { error: routeError } = await supabase
    .from("delivery_routes")
    .insert([{
      company_id: companyId,
      driver_id: driverId,
      date: date,
      route_number: nextRouteNumber,
      status: "Pendente",
      stops: stops
    }]);

  if (routeError) {
    console.error("Supabase Insert Error (delivery_routes):", routeError);
    return NextResponse.json({ error: "Erro ao salvar rota: " + routeError.message }, { status: 400 });
  }

  // 3️⃣ Atualiza as orders selecionadas
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      driver_id: driverId,
      route_number: nextRouteNumber,
      delivery_status: type,
    })
    .in("id", deliveryIds);

  if (updateError) {
    return NextResponse.json({ error: "Erro ao atualizar pedidos: " + updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, routeNumber: nextRouteNumber });
}
export async function PUT(request: Request) {
  const supabase = getAdminClient();

  const body = await request.json();
  const { routeId, routeNumber, deliveryIds, driverId, date, type, stops, companyId } = body;

  if (!routeId || !routeNumber || !deliveryIds?.length || !driverId || !date || !type || !stops || !companyId) {
    return NextResponse.json({ error: "Dados incompletos para atualização" }, { status: 400 });
  }

  // 1️⃣ Resetar os pedidos antigos que pertenciam a esta rota
  const { error: resetError } = await supabase
    .from("orders")
    .update({
      driver_id: null,
      route_number: null
    })
    .eq("company_id", companyId)
    .eq("route_number", routeNumber);

  if (resetError) {
    console.error("Erro ao resetar pedidos antigos:", resetError);
    return NextResponse.json({ error: "Erro ao resetar pedidos antigos" }, { status: 400 });
  }

  // 2️⃣ Atualizar o registro da rota
  const { error: routeError } = await supabase
    .from("delivery_routes")
    .update({
      driver_id: driverId,
      date: date,
      stops: stops
    })
    .eq("id", routeId);

  if (routeError) {
    console.error("Supabase Update Error (delivery_routes):", routeError);
    return NextResponse.json({ error: "Erro ao atualizar rota: " + routeError.message }, { status: 400 });
  }

  // 3️⃣ Atribuir a rota aos novos pedidos
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      driver_id: driverId,
      route_number: routeNumber,
      delivery_status: type,
    })
    .in("id", deliveryIds);

  if (updateError) {
    console.error("Erro ao atribuir pedidos:", updateError);
    return NextResponse.json({ error: "Erro ao atribuir pedidos: " + updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, routeNumber: routeNumber });
}
export async function DELETE(request: Request) {
  const supabase = getAdminClient();
  
  try {
    const url = new URL(request.url);
    const routeId = url.searchParams.get("routeId");
    
    if (!routeId) {
      return NextResponse.json({ error: "ID da rota não fornecido" }, { status: 400 });
    }

    // 1️⃣ Buscar a rota para saber o route_number e company_id (opcional, mas bom)
    const { data: route, error: fetchError } = await supabase
      .from("delivery_routes")
      .select("route_number, company_id")
      .eq("id", routeId)
      .single();

    if (fetchError || !route) {
      return NextResponse.json({ error: "Rota não encontrada" }, { status: 404 });
    }

    // 2️⃣ Limpar os pedidos associados a essa rota
    const { error: ordersError } = await supabase
      .from("orders")
      .update({
        driver_id: null,
        route_number: null
      })
      .eq("company_id", route.company_id)
      .eq("route_number", route.route_number);

    if (ordersError) {
      console.error("Erro ao limpar pedidos:", ordersError);
      return NextResponse.json({ error: "Erro ao atualizar pedidos vinculados" }, { status: 400 });
    }

    // 3️⃣ Deletar a rota
    const { error: deleteError } = await supabase
      .from("delivery_routes")
      .delete()
      .eq("id", routeId);

    if (deleteError) {
      console.error("Erro ao deletar rota:", deleteError);
      return NextResponse.json({ error: "Erro ao excluir a rota" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no DELETE:", error);
    return NextResponse.json({ error: "Erro interno ao processar a exclusão" }, { status: 500 });
  }
}
