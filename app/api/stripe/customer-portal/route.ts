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

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("id", subscriptionIdLocal)
      .eq("company_id", companyId)
      .single();

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: error?.message || "Cliente Stripe não encontrado" },
        { status: 404 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}