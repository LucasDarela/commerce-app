// app/api/stripe/cancel/route.ts

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    const { subscriptionIdLocal } = await req.json();
    if (!subscriptionIdLocal) {
      return NextResponse.json(
        { error: "subscriptionIdLocal é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createServerComponentClient({ cookies });

    // Busca a assinatura no Supabase
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionIdLocal)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: fetchError?.message || "Assinatura não encontrada" },
        { status: 404 },
      );
    }

    const stripeSubscriptionId = subscription.stripe_subscription_id;
    if (stripeSubscriptionId) {
      // Cancela a assinatura no Stripe
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    }

    // Atualiza o status no Supabase
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("id", subscriptionIdLocal);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Assinatura cancelada com sucesso." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro desconhecido" },
      { status: 500 },
    );
  }
}
