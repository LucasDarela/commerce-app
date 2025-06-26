// lib/fetchOrderDetails.ts
import { supabase } from "@/lib/supabase";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    code: string;
  };
};

type OrderDetails = {
  id: string;
  customer: any;
  company: any;
  note_number: string;
  document_type: string;
  issue_date: string;
  due_date: string;
  appointment_date: string;
  appointment_hour: string | null;
  appointment_local: string | null;
  text_note: string;
  customer_signature: string | null;
  phone: string;
  freight: number;
  total: number;
  payment_method: string;
  delivery_status: string;
  payment_status: string;
  order_items: OrderItem[];
};

export async function fetchOrderDetails(
  orderId: string,
): Promise<OrderDetails | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers:customers(*),
      companies:companies!fk_company_id(*),
      order_items(
        id,
        quantity,
        price,
        product_id,
        products(name, code)
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
    customer: data.customers,
    company: data.companies,
    note_number: data.note_number,
    document_type: data.document_type,
    issue_date: data.issue_date,
    due_date: data.due_date,
    appointment_date: data.appointment_date,
    appointment_hour: data.appointment_hour,
    appointment_local: data.appointment_local,
    text_note: data.text_note,
    customer_signature: data.customer_signature,
    phone: data.phone,
    freight: data.freight,
    total: data.total,
    payment_method: data.payment_method,
    delivery_status: data.delivery_status,
    payment_status: data.payment_status,
    order_items: data.order_items ?? [],
  };
}
