import { MercadoPagoConfig, Payment } from "mercadopago";

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error("MP_ACCESS_TOKEN não definido nas variáveis de ambiente");
}

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(client);

export async function createPayment(payload: any) {
  try {
    const response = await payment.create({ body: payload });
    return response;
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    throw error;
  }
}