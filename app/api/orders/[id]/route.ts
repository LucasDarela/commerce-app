import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orderId = id;

  const supabase = createRouteHandlerClient({ cookies });

  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: rel } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyId = rel?.company_id;
    if (!companyId) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 400 },
      );
    }

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, company_id")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !order || order.company_id !== companyId) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("invoices").delete().eq("order_id", orderId);

    const { error: delErr } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro interno" },
      { status: 500 },
    );
  }
}
