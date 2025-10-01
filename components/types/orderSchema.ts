//components/types/orderSchema.ts
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
  appointment_hour: z.string().nullable(),
  appointment_local: z.string().nullable(),
  customer: z.string(),
  fantasy_name: z.string().optional(),
  customer_id: z.string().nullable(),
  customer_signature: z.string().nullable().optional(),
  phone: z.string(),
  amount: z.number(),
  products: z.string(),
  delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]),
  payment_method: paymentMethodEnum,
  payment_status: z.enum(["Unpaid", "Paid", "Partial"]),
  days_ticket: z.union([z.string(), z.number()]).optional(),
  freight: z.union([z.string(), z.number(), z.null()]).optional(),
  note_number: z.string().optional(),
  document_type: z.string().optional(),
  total: z.number(),
  total_payed: z.number().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  text_note: z.string().nullable().optional(),
  boleto_id: z.string().nullable().optional(),
  source: z.enum(["order", "financial"]).optional(),
  order_items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number(),
        price: z.number(),
        product: z
          .object({
            name: z.string(),
            code: z.number(),
          })
          .nullable(),
      }),
    )
    .optional()
    .default([]),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderWithSource = Order & { source: "order" };
// Schema para listagem
export const orderSummarySchema = orderSchema.omit({ order_items: true });
