import { supabase } from "@/lib/supabase"

type OrderItemWithProduct = {
  id: string
  product_id: string
  quantity: number
  price: number
  products?: {
    name: string
  }
}

export async function fetchOrderDetails(orderId: string) {
const { data, error } = await supabase
  .from("orders")
  .select(`
    *,
    customers:customers(*),
    companies:companies!fk_company_id(*),
    order_items:order_items(*, product:products(*))
  `)
  .eq("id", orderId)
  .single()

  if (error) {
    throw error
  }

  return {
    ...data,
    customer: data.customers,
    company: data.companies,
    items: data.order_items.map((item: OrderItemWithProduct) => ({
      id: item.id,
      code: item.product_id,
      name: item.products?.name ?? "Produto não encontrado",
      quantity: item.quantity,
      unit_price: item.price,
    }))
  }
}