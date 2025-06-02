import { z } from "zod"

export const paymentMethodEnum = z.enum(["Dinheiro", "Cartao", "Boleto", "Pix"])

export const orderSchema = z.object({
  id: z.string(),
  appointment_date: z.string(),
  appointment_hour: z.string(),
  appointment_local: z.string(),
  customer: z.string(),
  phone: z.string(),
  amount: z.number(),
  products: z.string(),
  delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]),
  payment_method: paymentMethodEnum,
  payment_status: z.enum(["Unpaid", "Paid"]),
  days_ticket: z.union([z.string(), z.number()]).optional(),
  freight: z.union([z.string(), z.number(), z.null()]).optional(),
  note_number: z.string().optional(),
  document_type: z.string().optional(),
  total: z.number(),
  total_payed: z.number().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  source: z.literal("order"),
})


export const financialSchema = z.object({
  id: z.string(),
  supplier_id: z.string().uuid().optional().nullable(),
  supplier: z.string(),
  company_id: z.string(),
  issue_date: z.string(),
  due_date: z.string().nullable().optional(),
  description: z.string().optional(),
  category: z.string(),
  amount: z.preprocess((val) => Number(val), z.number()),
  status: z.enum(["Paid", "Unpaid"]),
  payment_method: paymentMethodEnum,
  invoice_number: z.string().optional(),
  type: z.enum(["input", "output"]),
  notes: z.string().optional(),
  source: z.literal("financial"),
  phone: z.string().optional(),
  total_payed: z.preprocess((val) => Number(val ?? 0), z.number().optional()),
})