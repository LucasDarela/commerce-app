// components/data-financial/utils.ts

import { Order } from "@/components/types/orders"
import { FinancialRecord } from "@/components/types/financial"
import type { CombinedRecord } from "@/components/financial/DataFinancialTable"

/**
 * Verifica se o registro é um pedido (order).
 */
export function isOrder(record: any): record is Order {
  return record?.source === "order"
}

/**
 * Verifica se o registro é um lançamento financeiro (financial record).
 */
export function isFinancial(record: any): record is FinancialRecord {
  return record?.source === "financial"
}

/**
 * Converte o nome do método de pagamento do pedido para o formato do financeiro.
 */
export function mapToFinancialPaymentMethod(
  method: "Pix" | "Dinheiro" | "Boleto" | "Cartao"
): "Pix" | "Cash" | "Ticket" | "Card" {
  switch (method) {
    case "Dinheiro":
      return "Cash"
    case "Cartao":
      return "Card"
    case "Boleto":
      return "Ticket"
    default:
      return method
  }
}

export function groupByDueMonth(data: CombinedRecord[]) {
  return data.reduce((acc, item) => {
    const dueDate = item.due_date || item.issue_date;
    if (!dueDate) return acc;

    const date = new Date(dueDate);
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    acc[key] = acc[key] || [];
    acc[key].push(item);

    return acc;
  }, {} as Record<string, CombinedRecord[]>);
}