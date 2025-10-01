//components/financial/schema.ts
import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "Dinheiro",
  "Cartao",
  "Boleto",
  "Pix",
]);

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
  status: z.enum(["Paid", "Unpaid", "Partial"]),
  payment_method: paymentMethodEnum,
  invoice_number: z.string().optional(),
  type: z.enum(["input", "output"]),
  notes: z.string().optional(),
  source: z.literal("financial"),
  phone: z.string().optional(),
  total_payed: z.preprocess((val) => Number(val ?? 0), z.number().optional()),
});

export type FinancialRecord = z.infer<typeof financialSchema>;
