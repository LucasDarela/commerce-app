import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const daysToExpire = parseInt(body.days_ticket) || 1;
    const today = new Date();
    const dueDate = new Date(today.setDate(today.getDate() + daysToExpire));
    const formattedDueDate = dueDate.toISOString().split("T")[0];

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

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: selectedCustomer?.name,
        email: selectedCustomer?.email || "email@placeholder.com",
        document: selectedCustomer?.document?.replace(/\D/g, ""),
        total: getTotal(),
        days_ticket: order.days_ticket,
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