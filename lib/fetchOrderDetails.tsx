import { supabase } from "@/lib/supabase"

export async function fetchOrderDetails(orderId: string) {
const { data, error } = await supabase
  .from("orders")
  .select(`
    *,
    customers:customers(*),
    companies:companies!fk_company_id(*),
    order_items:order_items(*, products:products(*))
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
    items: data.order_items,
  }
}