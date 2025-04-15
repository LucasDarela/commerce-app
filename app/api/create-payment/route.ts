import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const isCPF = body.cpf_cnpj.length === 11;

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_amount: body.total,
      description: "Pagamento de pedido Boleto Chopp Hub",
      payment_method_id: "bolbradesco", // boleto
      payer: {
        email: body.email,
        first_name: body.nome,
        identification: {
          type: isCPF ? "CPF" : "CNPJ",
        number: body.cpf_cnpj,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro ao gerar pagamento:", data);
    return NextResponse.json({ error: data }, { status: 400 });
  }

  return NextResponse.json(data);
}