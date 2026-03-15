export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { subscriptionIdLocal, companyId } = await req.json();

    if (!subscriptionIdLocal || !companyId) {
      return NextResponse.json(
        { error: "subscriptionIdLocal e companyId são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionIdLocal)
      .eq("company_id", companyId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Assinatura Stripe não encontrada" },
        { status: 400 },
      );
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      },
    );

    const { error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionIdLocal)
      .eq("company_id", companyId);

    if (error) throw error;

    return NextResponse.json({
      message: "Assinatura reativada com sucesso.",
      cancelAtPeriodEnd: false,
      status: updatedStripeSubscription.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao reativar assinatura" },
      { status: 500 },
    );
  }
}