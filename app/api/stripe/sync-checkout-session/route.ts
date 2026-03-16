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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getSubscriptionPeriodStart(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>
) {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number | null;
      })
    | undefined;

  return item?.current_period_start ?? null;
}

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>
) {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_end?: number | null;
      })
    | undefined;

  return item?.current_period_end ?? null;
}

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const companyId = session.metadata?.companyId ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId não encontrado na sessão" },
        { status: 400 }
      );
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId não encontrado na sessão" },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });

    const rawCurrentPeriodStart = getSubscriptionPeriodStart(subscription);
    const rawCurrentPeriodEnd = getSubscriptionPeriodEnd(subscription);

    const currentPeriodStart = rawCurrentPeriodStart
      ? new Date(rawCurrentPeriodStart * 1000).toISOString()
      : null;

    const currentPeriodEnd = rawCurrentPeriodEnd
      ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
      : null;

    const latestInvoiceId =
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null;

    const startedAt = subscription.start_date
      ? new Date(subscription.start_date * 1000).toISOString()
      : null;

    const trialStart = subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null;

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    const { error } = await supabase.from("subscriptions").upsert(
      {
        company_id: companyId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        price_id: subscription.items.data[0]?.price?.id ?? null,
        status: subscription.status,
        started_at: startedAt,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        latest_invoice_id: latestInvoiceId,
        metadata: subscription.metadata ?? {},
        raw_payload: subscription,
        updated_at: new Date().toISOString(),
        trial_start: trialStart,
        trial_end: trialEnd,
      },
      {
        onConflict: "stripe_subscription_id",
      }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Erro ao sincronizar checkout session",
      },
      { status: 500 }
    );
  }
}