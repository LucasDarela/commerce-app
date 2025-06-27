import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { orderSchema, type Order } from "@/components/types/orderSchema";
import { OrderWithSource } from "@/components/types/orderSchema";

export async function fetchOrders(
  companyId: string,
): Promise<OrderWithSource[]> {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
    id,
    customer_id,
    appointment_date,
    appointment_hour,
    appointment_local,
    customer,
    customer_signature,
    phone,
    amount,
    products,
    delivery_status,
    payment_status,
    payment_method,
    days_ticket,
    freight,
    note_number,
    document_type,
    total,
    total_payed,
    issue_date,
    due_date,
    text_note,
    boleto_id,    
    order_items (
      product_id,
      quantity,
      price,
      product:products!order_items_product_id_fkey (
      name,
      code
      )
    )
  `,
    )
    .eq("company_id", companyId)
    .order("appointment_date", { ascending: false });

  console.log("DATA CRUA DO SUPABASE >>>", data);

  if (error) {
    console.error("Erro ao buscar pedidos:", JSON.stringify(error, null, 2));
    return [];
  }

  // ✅ Aqui o SAFE DATA - Garantindo que nunca venha undefined
  const safeData = (data ?? []).map((o) => ({
    ...o,
    appointment_hour: o.appointment_hour ?? null,
    appointment_local: o.appointment_local ?? null,
    days_ticket: String(o.days_ticket ?? ""),
    freight: o.freight ?? 0,
    total_payed: o.total_payed ?? 0,
    source: "order" as const,
    order_items: o.order_items ?? [],
  }));

  const result = z.array(orderSchema).safeParse(safeData);

  if (!result.success) {
    console.error("Erro ao validar schema:", result.error);
    return [];
  }

  return result.data.map((order) => ({
    ...order,
    order_items: order.order_items ?? [],
    source: "order",
  }));
}
