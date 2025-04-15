import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  // Verifica se é CPF ou CNPJ com base no número (11 ou 14 dígitos)
  const cleanDoc = body.document.replace(/\D/g, "");
  const docType = cleanDoc.length === 11 ? "CPF" : "CNPJ";

  const [first_name, ...rest] = (body.nome || "Cliente").split(" ");
  const last_name = rest.join(" ") || "Sobrenome";

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: "Pedido no Chopp Hub",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(body.total),
        },
      ],
      payer: {
        email: body.email,
        first_name,
        last_name,
        identification: {
          type: docType,
          number: cleanDoc,
        },
      },
      payment_methods: {
        // agora permite boleto também
        excluded_payment_types: [], // permite todos
      },
      back_urls: {
        success: "https://chopphub.com/sucesso",
        failure: "https://chopphub.com/falha",
        pending: "https://chopphub.com/pendente",
      },
      auto_return: "approved",
    }),
  });

  const data = await response.json();

  return NextResponse.json(data);
}