// components/data-financial/utils.ts

import { Order } from "@/components/types/orders"
import { FinancialRecord } from "@/components/types/financial"

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