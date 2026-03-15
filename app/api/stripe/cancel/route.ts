export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não definida");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function POST(req: Request) {
  try {
    const { subscriptionIdLocal, companyId } = await req.json();

    if (!subscriptionIdLocal) {
      return NextResponse.json(
        { error: "subscriptionIdLocal é obrigatório" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId é obrigatório" },
        { status: 400 },
      );
    }

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionIdLocal)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: fetchError?.message || "Assinatura não encontrada" },
        { status: 404 },
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Assinatura Stripe não encontrada" },
        { status: 400 },
      );
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({
        message: "A assinatura já está configurada para cancelamento ao final do período.",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.current_period_end,
        status: subscription.status,
      });
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      },
    );

    const currentPeriodEnd =
      updatedStripeSubscription.current_period_end
        ? new Date(updatedStripeSubscription.current_period_end * 1000).toISOString()
        : null;

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: updatedStripeSubscription.status,
        cancel_at_period_end: updatedStripeSubscription.cancel_at_period_end,
        canceled_at: null,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionIdLocal)
      .eq("company_id", companyId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Assinatura configurada para cancelamento ao final do período.",
      cancelAtPeriodEnd: updatedStripeSubscription.cancel_at_period_end,
      currentPeriodEnd,
      status: updatedStripeSubscription.status,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}