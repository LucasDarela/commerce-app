import { supabase } from "@/lib/supabase";

type OrderItemWithProduct = {
  id: string;
  product_id: string;
  quantity: number;
  note_number: string;
  price: number;
  products?: {
    name: string;
    note_number?: string;
  };
};

export async function fetchOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
    *,
    note_number,
    customers:customers(*),
    companies:companies!fk_company_id(*),
    order_items:order_items(id, quantity, price, product_id, products(name, code))
  `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    customer: data.customers,
    company: data.companies,
    items: data.order_items.map((item: OrderItemWithProduct) => ({
      id: item.id,
      note_number: item.products?.note_number ?? "000",
      name: item.products?.name ?? "Produto não encontrado",
      quantity: item.quantity,
      unit_price: item.price,
    })),
  };
}
