// components/data-financial/utils.ts
import { Order } from "@/components/types/orders";
import type { FinancialRecord } from "@/components/financial/schema";
import type { CombinedRecord } from "@/components/financial/types";

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
      if (!item.due_date) return acc;

      const [year, month] = item.due_date.split("-");
      if (!year || !month) return acc;

      const key = `${month}/${year}`;

      acc[key] = acc[key] || [];
      acc[key].push(item);

      return acc;
    },
    {} as Record<string, CombinedRecord[]>,
  );
}
