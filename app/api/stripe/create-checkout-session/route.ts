export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

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

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL não está definida no servidor." },
        { status: 500 },
      );
    }

    const successUrl = `${siteUrl}/dashboard/billing?success=true`;
    const cancelUrl = `${siteUrl}/dashboard/billing?canceled=true`;

    console.log("NEXT_PUBLIC_SITE_URL:", siteUrl);
    console.log("SUCCESS URL:", successUrl);
    console.log("CANCEL URL:", cancelUrl);
    console.log("priceId:", priceId);
    console.log("companyId:", companyId);

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    companyId,
    subscriptionIdLocal: subscriptionIdLocal || "",
  },
  subscription_data: {
    trial_period_days: 30,
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
      { error: err.message || "Erro ao criar checkout session" },
      { status: 500 },
    );
  }
}