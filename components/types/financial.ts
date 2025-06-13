import { z } from "zod";
import {
  financialSchema,
  paymentMethodEnum,
} from "@/components/financial/schema";

export type FinancialRecord = z.infer<typeof financialSchema> & {
  source: "order" | "financial";
  phone?: string;
  customer?: string;
  total_payed?: number;
};

export type PaymentMethodFinancial = z.infer<typeof paymentMethodEnum>;
