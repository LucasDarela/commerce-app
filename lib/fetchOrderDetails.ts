// // lib/fetchOrderDetails.ts
// import { supabase } from "@/lib/supabase";
// import { OrderDetails } from "@/components/types/orderDetails";

// type OrderItem = {
//   id: string;
//   quantity: number;
//   price: number;
//   product?: {
//     name: string;
//     code: string;
//   };
// };

// type OrderDetails = {
//   id: string;
//   customer: any;
//   company: any;
//   note_number: string;
//   document_type: string;
//   issue_date: string;
//   due_date: string;
//   appointment_date: string;
//   appointment_hour: string | null;
//   appointment_local: string | null;
//   text_note: string;
//   customer_signature: string | null;
//   phone: string;
//   freight: number;
//   total: number;
//   payment_method: string;
//   delivery_status: string;
//   payment_status: string;
//   items: OrderItem[];
//   quantity: number;
//   price: number;
//   product_id: string;
//   products: {
//     name: string;
//     code: string;
//   } | null;
// };

// function toPaidEnum(v: unknown): "Paid" | "Unpaid" {
//   const s = String(v ?? "").toLowerCase();
//   return s === "paid" ? "Paid" : "Unpaid";
// }

// export async function fetchOrderDetails(
//   orderId: string,
// ): Promise<OrderDetails | null> {
//   const { data, error } = await supabase
//     .from("orders")
//     .select(
//       `
//       *,
//       customers:customers(*),
//       company:companies!fk_company_id(*),
//       order_items(
//         *,
//       product:products!order_items_product_id_fkey (name, code)
//       )
//     `,
//     )
//     .eq("id", orderId)
//     .single();

//   if (error || !data) {
//     console.error("Erro ao buscar detalhes do pedido:", error);
//     return null;
//   }

//   return {
//     id: data.id,
//     customer: data.customers,
//     company: data.company,
//     note_number: data.note_number,
//     document_type: data.document_type,
//     issue_date: data.issue_date,
//     due_date: data.due_date,
//     appointment_date: data.appointment_date,
//     appointment_hour: data.appointment_hour,
//     appointment_local: data.appointment_local,
//     text_note: data.text_note,
//     customer_signature: data.customer_signature,
//     phone: data.phone,
//     freight: data.freight,
//     total: data.total,
//     payment_method: data.payment_method,
//     delivery_status: data.delivery_status,
//     payment_status: toPaidEnum(data.payment_status),
//     items: (data.order_items ?? []).map((item: any) => ({
//       id: item.id,
//       quantity: item.quantity,
//       price: item.price,
//       product: {
//         name: item.product?.name ?? "Produto",
//         code: item.product?.code ?? "000",
//       },
//     })),
//     quantity: 0,
//     price: 0,
//     product_id: "",
//     products: null,
//   };
// }
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

function toPaidEnum(v: unknown): "Paid" | "Unpaid" {
  const s = String(v ?? "").toLowerCase();
  return s === "paid" ? "Paid" : "Unpaid";
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
      company:companies!fk_company_id(*),
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
    company: { id: data.company?.id, name: data.company?.name },
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
