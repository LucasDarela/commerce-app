import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📦 Dados recebidos para gerar boleto:", body);

    // Verificação de campos obrigatórios
    if (!body.document || !body.nome || !body.total) {
      console.error("❌ Dados obrigatórios ausentes");
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

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
          email: body.email || "sememail@chopphub.com",
          first_name,
          last_name,
          identification: {
            type: docType,
            number: cleanDoc,
          },
        },
        payment_methods: {
          excluded_payment_types: [], // permite todos os métodos
        },
        back_urls: {
          success: "https://chopphub.com/sucess",
          failure: "https://chopphub.com/failure",
          pending: "https://chopphub.com/pending",
        },
        auto_return: "approved",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro na API do Mercado Pago:", data);
      return NextResponse.json({ error: "Erro ao gerar pagamento", details: data }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Erro inesperado ao gerar boleto:", error);
    return NextResponse.json({ error: "Erro interno ao gerar boleto" }, { status: 500 });
  }
}