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
  status: "Paid" | "Unpaid";
  payment_method: "Pix" | "Dinheiro" | "Cartao" | "Boleto";
  invoice_number?: string;
  type: "input" | "output";
  notes?: string;
  source: "order" | "financial";
};
