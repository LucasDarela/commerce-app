export type Order = {
  id: string
  appointment_date: string
  appointment_hour: string
  appointment_local: string
  customer: string
  phone: string
  products: string
  amount: number
  delivery_status: "Entregar" | "Coletar" | "Coletado"
  payment_status: "Pendente" | "Pago"
  payment_method: "Pix" | "Dinheiro" | "Boleto" | "Cartao"
  days_ticket?: string | number
  freight?: string | number | null
  note_number?: string
  document_type?: string
  total: number
  order_index?: number | null
}