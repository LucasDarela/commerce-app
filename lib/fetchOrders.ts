import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { z } from "zod"

export const orderSchema = z.object({
  id: z.string().optional(),
  appointment_date: z
  .string({ required_error: "A data do agendamento é obrigatória" })
  .min(1, "A data do agendamento é obrigatória"),
  appointment_hour: z.string(),
  appointment_local: z.string(),
  customer: z.string(),
  phone: z.string(),
  amount: z.number(),
  products: z.string(),
  delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]), 
  payment_method: z.enum(["Pix", "Dinheiro", "Boleto", "Cartao"]).default("Pix"),
  payment_status: z.enum(["Pendente", "Pago"]),
  days_ticket: z.union([z.string(), z.number()]).optional(),
  freight: z.union([z.string(), z.number()]).optional(),
  note_number: z.string().optional(),
  document_type: z.string().optional(),
  total: z.number(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional()
})

export type Order = z.infer<typeof orderSchema>

export async function fetchOrders(companyId: string): Promise<Order[]> {
  const supabase = createClientComponentClient()

  const { data, error } = await supabase
  .from("orders")
  .select(`
    id,
    appointment_date,
    appointment_hour,
    appointment_local,
    customer,
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
    issue_date,
    due_date
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
  
  // Se quiser renomear os campos manualmente:
  return result.data.map((order) => ({
    ...order,
    date: order.appointment_date,
    hour: order.appointment_hour,
    location: order.appointment_local,
  }))

}