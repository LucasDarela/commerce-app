import { MercadoPagoConfig } from 'mercadopago'

// ✅ Criação da instância com token diretamente
export const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})