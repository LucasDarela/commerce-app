import { z } from "zod"
import { financialSchema } from "@/components/financial/schema"

export type FinancialRecord = z.infer<typeof financialSchema> & {
  source: "order" | "financial"
  phone?: string
  customer?: string
  total_payed?: number
}