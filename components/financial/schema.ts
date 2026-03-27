import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "Dinheiro",
  "Cartao",
  "Boleto",
  "Pix",
]);

export const financialSchema = z.object({
  id: z.string().uuid(),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier: z.string(),
  company_id: z.string().uuid(),
  issue_date: z.string(),
  due_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  amount: z.coerce.number(),
  status: z.enum(["Paid", "Unpaid"]),
  payment_method: paymentMethodEnum.optional(),
  invoice_number: z.string().nullable().optional(),
  type: z.enum(["input", "output"]),
  notes: z.string().nullable().optional(),
  source: z.literal("financial"),
  total_payed: z.coerce.number().optional(),
});

export type FinancialRecord = z.infer<typeof financialSchema>;