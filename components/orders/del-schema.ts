import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "Dinheiro",
  "Cartao",
  "Boleto",
  "Pix",
]);

export const orderSchema = z.object({
  id: z.string(),
  appointment_date: z.string(),
  appointment_hour: z.string().nullable().optional(),
  appointment_local: z.string().nullable().optional(),
  customer: z.string(),
  phone: z.string(),
  amount: z.number(),
  products: z.string(),
  delivery_status: z
    .enum(["Entregar", "Coletar", "Coletado"])
    .nullable()
    .optional(),
  payment_method: paymentMethodEnum.nullable().optional(),
  payment_status: z.enum(["Unpaid", "Paid", "Pending"]).nullable().optional(),
  days_ticket: z.union([z.string(), z.number()]).optional(),
  freight: z.union([z.string(), z.number(), z.null()]).optional(),
  note_number: z.string().optional(),
  document_type: z.string().nullable().optional(),
  total: z.number(),
  total_payed: z.number().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  source: z.literal("order").optional(),
});
