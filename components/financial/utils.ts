// components/data-financial/utils.ts
import { Order } from "@/components/types/orders";
import { FinancialRecord } from "@/components/types/financial";
import type { CombinedRecord } from "@/components/financial/DataFinancialTable";

export function isOrder(record: any): record is Order {
  return record?.source === "order";
}

export function isFinancial(record: any): record is FinancialRecord {
  return record?.source === "financial";
}

export function mapToFinancialPaymentMethod(method: string) {
  switch (method) {
    case "Cash":
      return "Dinheiro";
    case "Card":
      return "Cartao";
    case "Ticket":
      return "Boleto";
    default:
      return method;
  }
}

export function groupByDueMonth(data: CombinedRecord[]) {
  return data.reduce(
    (acc, item) => {
      const dueDate = item.due_date || item.issue_date;
      if (!dueDate) return acc;

      const date = new Date(dueDate);
      const key = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      acc[key] = acc[key] || [];
      acc[key].push(item);

      return acc;
    },
    {} as Record<string, CombinedRecord[]>,
  );
}
