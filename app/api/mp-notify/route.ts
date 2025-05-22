// app/api/mp-notify/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/components/types/supabase";

export async function POST(req: Request) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    const body = await req.json();

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: "ID do pagamento não fornecido" }, { status: 400 });
    }

    // 1. Buscar pagamento do Mercado Pago usando ID recebido
    const tempToken = process.env.MP_ACCESS_TOKEN!;
    const tempResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${tempToken}`,
      },
    });

    const payment = await tempResponse.json();

    if (!payment.external_reference) {
      return NextResponse.json({ error: "Pagamento sem referência externa" }, { status: 400 });
    }

    // 2. Buscar o pedido para obter o company_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("company_id")
      .eq("id", payment.external_reference)
      .single();

    if (!order || orderError) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // 3. Buscar o access_token correto para a empresa
    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("access_token")
      .eq("company_id", order.company_id)
      .eq("provider", "mercado_pago")
      .maybeSingle();

    if (!integration || !integration.access_token || integrationError) {
      return NextResponse.json({ error: "Access token não encontrado para a empresa" }, { status: 400 });
    }

    // 4. Revalidar os dados com o token certo (caso queira garantir)
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
      },
    });

    const validatedPayment = await response.json();

    // 5. Atualizar status de pagamento
    if (validatedPayment.status === "approved") {
      await supabase
        .from("orders")
        .update({
          payment_status: "Pago",
          total_payed: validatedPayment.transaction_amount,
        })
        .eq("id", validatedPayment.external_reference);
    

        await supabase
            .from("notifications")
            .insert([
                {
                company_id: order.company_id,
                title: "Pagamento aprovado",
                description: `Pagamento de R$ ${payment.transaction_amount} aprovado.`,
                },
            ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erro no webhook do Mercado Pago:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}