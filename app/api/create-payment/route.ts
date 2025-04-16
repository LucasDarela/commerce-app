import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📦 Dados recebidos para gerar boleto:", body);

    // Validação dos campos obrigatórios
    if (!body.nome || !body.document || !body.total || !body.days_ticket) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const cleanDoc = body.document.replace(/\D/g, "");
    const docType = cleanDoc.length === 11 ? "CPF" : "CNPJ";

    const [first_name, ...rest] = (body.nome || "Cliente").split(" ");
    const last_name = rest.join(" ") || "Sobrenome";

    // Cálculo da data de vencimento
    const daysToExpire = parseInt(body.days_ticket) || 1;
    const today = new Date();
    const dueDate = new Date(today.setDate(today.getDate() + daysToExpire));
    const formattedDueDate = dueDate.toISOString(); // ISO completo (Mercado Pago aceita)

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_amount: Number(body.total),
        payment_method_id: "bolbradesco", // Gera boleto direto
        description: "Pedido no Chopp Hub",
        statement_descriptor: "CHOPPHUB",
        date_of_expiration: formattedDueDate,
        payer: {
          email: body.email,
          first_name,
          last_name,
          identification: {
            type: docType,
            number: cleanDoc,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro na API do Mercado Pago:", data);
      return NextResponse.json(
        { error: "Erro ao gerar pagamento", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Erro interno no create-payment:", error);
    return NextResponse.json({ error: "Erro interno ao gerar boleto" }, { status: 500 });
  }
}