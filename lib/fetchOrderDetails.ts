// lib/fetchOrderDetails.tss// lib/fetchOrderDetails.ts
import { supabase } from "@/lib/supabase";
import type { OrderDetails } from "@/components/types/orderDetails";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    code: string | number;
  };
};

function toPaidEnum(v: unknown): "Paid" | "Unpaid" | "Partial" {
  const s = String(v ?? "").toLowerCase();
  return s === "paid" ? "Paid" : s === "unpaid" ? "Unpaid" : "Partial";
}

export async function fetchOrderDetails(
  orderId: string,
): Promise<OrderDetails | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
    *,
    customers:customers(*),
    company:companies!fk_company_id(
      id,
      name,
      trade_name,
      document,
      email,
      phone,
      address,
      number,
      neighborhood,
      city,
      state,
      zip_code
    ),
    order_items(
      *,
      product:products!order_items_product_id_fkey (name, code)
    )
  `,
    )
    .eq("id", orderId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar detalhes do pedido:", error);
    return null;
  }

  return {
    id: data.id,
    // company no formato que seu tipo espera:
    company: {
      id: data.company?.id,
      name: data.company?.name ?? null,
      trade_name: data.company?.trade_name ?? data.company?.name ?? null,
      document: data.company?.document ?? null,
      email: data.company?.email ?? null,
      phone: data.company?.phone ?? null,
      address: data.company?.address ?? null,
      number: data.company?.number ?? null,
      neighborhood: data.company?.neighborhood ?? null,
      city: data.company?.city ?? null,
      state: data.company?.state ?? null,
      zip_code: data.company?.zip_code ?? null,
    },
    // cliente completo (já contém phone, address, etc)
    customer: data.customers,
    note_number: data.note_number ?? undefined,
    document_type: data.document_type ?? null,
    customer_signature: data.customer_signature ?? null,
    freight: data.freight ?? null,
    total: data.total,
    payment_method: data.payment_method,
    delivery_status: data.delivery_status,
    payment_status: toPaidEnum(data.payment_status),

    items: (data.order_items ?? []).map(
      (item: any): OrderItem => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          name: item.product?.name ?? "Produto",
          code: item.product?.code ?? "000",
        },
      }),
    ),

    // extras usados na página
    products: String(data.products ?? ""),
    created_by: data.created_by ?? undefined,
    stock_updated: data.stock_updated ?? undefined,
  };
}
