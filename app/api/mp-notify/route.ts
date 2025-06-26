import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/components/types/supabase";

export async function POST(req: Request) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    const body = await req.json();
    console.log("📨 Webhook recebido - Body:", JSON.stringify(body));

    const paymentId = body.data?.id;
    console.log("✅ Payment ID recebido:", paymentId);

    if (!paymentId) {
      console.error("❌ ID do pagamento não encontrado no body");
      return NextResponse.json(
        { error: "ID do pagamento não fornecido" },
        { status: 400 },
      );
    }

    // 1. Buscar o pagamento no Mercado Pago (token temporário)
    const tempToken = process.env.MP_ACCESS_TOKEN!;
    const tempResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      },
    );

    const tempText = await tempResponse.text();
    console.log("🔎 Retorno da API MP (temp token):", tempText);

    let payment;
    try {
      payment = JSON.parse(tempText);
    } catch (e) {
      console.error("❌ Erro ao fazer parse do JSON de tempResponse:", e);
      return NextResponse.json(
        { error: "Falha ao ler resposta da API MP" },
        { status: 500 },
      );
    }

    if (!payment.external_reference) {
      console.error("❌ Pagamento sem external_reference");
      return NextResponse.json(
        { error: "Pagamento sem referência externa" },
        { status: 400 },
      );
    }

    console.log(
      "📌 External Reference (Order ID):",
      payment.external_reference,
    );

    // 2. Buscar o pedido (order) no Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("company_id")
      .eq("id", payment.external_reference)
      .single();

    if (!order || orderError) {
      console.error("❌ Pedido não encontrado:", orderError);
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    console.log("📦 Order encontrado no Supabase:", order);

    // 3. Buscar o access_token correto da empresa
    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("access_token")
      .eq("company_id", order.company_id)
      .eq("provider", "mercado_pago")
      .maybeSingle();

    if (!integration || !integration.access_token || integrationError) {
      console.error(
        "❌ Access Token da empresa não encontrado:",
        integrationError,
      );
      return NextResponse.json(
        { error: "Access token não encontrado para a empresa" },
        { status: 400 },
      );
    }

    console.log("🔐 Access Token da empresa:", integration.access_token);

    // 4. Revalidar o pagamento com o token da empresa
    const validatedResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
        },
      },
    );

    const validatedText = await validatedResponse.text();
    console.log("✅ Resposta da API MP (token da empresa):", validatedText);

    let validatedPayment;
    try {
      validatedPayment = JSON.parse(validatedText);
    } catch (e) {
      console.error("❌ Erro ao fazer parse do JSON de validatedResponse:", e);
      return NextResponse.json(
        { error: "Falha ao ler resposta validada da API MP" },
        { status: 500 },
      );
    }

    // 5. Se o pagamento foi aprovado, atualizar o pedido
    if (validatedPayment.status === "approved") {
      console.log("💰 Pagamento aprovado! Atualizando pedido...");

      await supabase
        .from("orders")
        .update({
          payment_status: "Pago",
          total_payed: validatedPayment.transaction_amount,
        })
        .eq("id", validatedPayment.external_reference);

      await supabase.from("notifications").insert([
        {
          company_id: order.company_id,
          title: "Pagamento aprovado",
          description: `Pagamento de R$ ${validatedPayment.transaction_amount} aprovado.`,
        },
      ]);

      console.log("✅ Pedido e notificação atualizados com sucesso!");
    } else {
      console.log(
        "ℹ️ Pagamento ainda não aprovado. Status:",
        validatedPayment.status,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erro no webhook do Mercado Pago:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
