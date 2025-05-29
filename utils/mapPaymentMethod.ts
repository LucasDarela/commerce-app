// utils/mapPaymentMethod.ts

export type PaymentMethodApp = "Dinheiro" | "Cartao" | "Boleto" | "Pix"
export type PaymentMethodFinancial = "Dinheiro" | "Cartao" | "Boleto" | "Pix"

// Mapeia (por compatibilidade futura, mas retorna o próprio valor)
export const mapToFinancial = (
  method: PaymentMethodApp
): PaymentMethodFinancial => {
  return method // já estão padronizados
}

export const mapFromFinancial = (
  method: PaymentMethodFinancial
): PaymentMethodApp => {
  return method // já estão padronizados
}