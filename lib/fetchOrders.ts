import { z } from "zod";
import {
  orderSchema,
  type OrderWithSource,
} from "@/components/types/orderSchema";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ProductRow = {
  name: string | null;
  code: string | number | null;
};

type OrderItemRow = {
  product_id: string | number | null;
  quantity: number | null;
  price: number | null;
  product?: ProductRow | ProductRow[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchOrders(
  companyId: string,
): Promise<OrderWithSource[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
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
    `)
    .eq("company_id", companyId)
    .order("appointment_date", { ascending: false });

  if (error) {
    console.error("Erro ao buscar pedidos:", JSON.stringify(error, null, 2));
    return [];
  }

  const safeData = (data ?? []).map((o) => ({
    ...o,
    appointment_hour: o.appointment_hour ?? null,
    appointment_local: o.appointment_local ?? null,
    days_ticket: String(o.days_ticket ?? ""),
    freight: Number(o.freight ?? 0),
    total_payed: Number(o.total_payed ?? 0),
    source: "order" as const,
    order_items: ((o.order_items ?? []) as OrderItemRow[])
      .filter((item) => item?.product_id != null)
      .map((item) => {
        const product = firstOrNull<ProductRow>(item.product);

        return {
          product_id: String(item.product_id),
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
          product: product
            ? {
                name: product.name ?? "Produto",
                code: product.code ?? "000",
              }
            : null,
        };
      }),
  }));

  const result = z.array(orderSchema).safeParse(safeData);

  if (!result.success) {
    console.error("Erro ao validar schema:", result.error);
    return [];
  }

  return result.data.map((item) => ({
    ...item,
    source: "order" as const,
  }));
}