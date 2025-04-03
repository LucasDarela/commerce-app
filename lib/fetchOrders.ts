import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { z } from "zod"

export const orderSchema = z.object({
  id: z.string(),
  date: z.string(),
  hour: z.string(),
  customer: z.string(),
  phone: z.string(),
  amount: z.number(),
  location: z.string(),
  delivery_status: z.enum(["Pending", "Deliver", "Collect"]), 
  payment_status: z.enum(["Pending", "Paid"]),
  payment_method: z.enum(["Pix", "Cash", "Ticket", "Card"]),
})

export type Order = z.infer<typeof orderSchema>

export async function fetchOrders(companyId: string): Promise<Order[]> {
  const supabase = createClientComponentClient()

  const { data, error } = await supabase
  .from("orders")
  .select(`
    id,
    appointment_date as date,
    appointment_hour as hour,
    appointment_local as location,
    customer,
    phone,
    amount,
    delivery_status,
    payment_status,
    payment_method
  `)
  .eq("company_id", companyId)
  .order("appointment_date", { ascending: false })

  if (error) {
    console.error("Erro ao buscar pedidos:", JSON.stringify(error, null, 2))
    return []
  }

  const result = z.array(orderSchema).safeParse(data)
  if (!result.success) {
    console.error("Erro ao validar schema:", result.error)
    return []
  }

  return result.data
}