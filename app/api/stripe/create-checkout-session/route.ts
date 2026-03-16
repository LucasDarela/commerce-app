export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não definida");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
}

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL não definida");
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
    const { priceId, companyId, subscriptionIdLocal } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "priceId obrigatório" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "companyId obrigatório" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const successUrl = `${siteUrl}/dashboard/billing?success=true`;
    const cancelUrl = `${siteUrl}/dashboard/billing?canceled=true`;

    console.log("Stripe key prefix:", process.env.STRIPE_SECRET_KEY?.slice(0, 12));
    console.log("priceId recebido:", priceId);
    console.log("companyId recebido:", companyId);

    const { data: existingSubscription, error: existingSubscriptionError } =
      await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("company_id", companyId)
        .in("status", ["active", "trialing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingSubscriptionError) {
      return NextResponse.json(
        { error: existingSubscriptionError.message },
        { status: 500 },
      );
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Sua empresa já possui uma assinatura ativa." },
        { status: 400 },
      );
    }

    const price = await stripe.prices.retrieve(priceId);
    console.log("Price encontrado no Stripe:", price.id, price.currency, price.type);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        companyId,
        subscriptionIdLocal: subscriptionIdLocal || "",
      },
      subscription_data: {
        trial_period_days: 30,
        trial_settings: {
          end_behavior: {
            missing_payment_method: "cancel",
          },
        },
        metadata: {
          companyId,
          subscriptionIdLocal: subscriptionIdLocal || "",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Erro ao criar checkout session:", err);

    return NextResponse.json(
      {
        error: err?.raw?.message || err.message || "Erro ao criar checkout session",
        type: err?.type || null,
        code: err?.code || null,
      },
      { status: 500 },
    );
  }
}