// components/financial/types.ts

export type FinancialRecord = {
  id: string;
  company_id: string;
  issue_date: string;
  due_date?: string | null;
  supplier: string;
  description?: string;
  category: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Partial";
  payment_method: "Pix" | "Dinheiro" | "Cartao" | "Boleto";
  invoice_number?: string;
  type: "input" | "output";
  notes?: string;
  source: "order" | "financial";
};

import type { Order } from "@/components/types/orderSchema";
import type { FinancialRecord as SchemaFinancialRecord } from "./schema";

export type InvoiceStatus =
  | "autorizado"
  | "processando_autorizacao"
  | "cancelado"
  | "inutilizado"
  | string;

export type CombinedRecord =
  | (Order & {
      source: "order";
      has_boleto?: boolean;
      has_nfe?: boolean;
    })
  | (SchemaFinancialRecord & {
      source: "financial";
      has_boleto?: boolean;
      has_nfe?: boolean;
    });