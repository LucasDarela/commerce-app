export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não definida");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET não definida");
}

function extractBillingEventData(event: Stripe.Event) {
  const object = event.data.object as any;

  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripeInvoiceId: string | null = null;
  let companyId: string | null = null;

  if (object.customer) {
    stripeCustomerId =
      typeof object.customer === "string"
        ? object.customer
        : object.customer?.id ?? null;
  }

  if (object.subscription) {
    stripeSubscriptionId =
      typeof object.subscription === "string"
        ? object.subscription
        : object.subscription?.id ?? null;
  }

if (object.id && String(object.id).startsWith("in_")) {
  stripeInvoiceId = object.id;
}

if (object.id && String(object.id).startsWith("sub_")) {
  stripeSubscriptionId = object.id;
}

if (object.id && String(object.id).startsWith("cus_")) {
  stripeCustomerId = object.id;
}

  if (object.latest_invoice) {
    stripeInvoiceId =
      typeof object.latest_invoice === "string"
        ? object.latest_invoice
        : object.latest_invoice?.id ?? stripeInvoiceId;
  }

  if (object.metadata?.companyId) {
    companyId = object.metadata.companyId;
  }

  if (!companyId && object.parent?.subscription_details?.metadata?.companyId) {
    companyId = object.parent.subscription_details.metadata.companyId;
  }

  if (!stripeSubscriptionId && object.parent?.subscription_details?.subscription) {
    stripeSubscriptionId =
      object.parent.subscription_details.subscription ?? stripeSubscriptionId;
  } 

  return {
    stripeCustomerId,
    stripeSubscriptionId,
    stripeInvoiceId,
    companyId,
  };
}

function getSubscriptionPeriodStart(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>,
) {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number | null;
      })
    | undefined;

  return item?.current_period_start ?? null;
}

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>,
) {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_end?: number | null;
      })
    | undefined;

  return item?.current_period_end ?? null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const rawSubscription =
    (invoice as Stripe.Invoice & {
      subscription?: string | { id?: string } | null;
    }).subscription ??
    (invoice as Stripe.Invoice & {
      parent?: {
        subscription_details?: {
          subscription?: string | { id?: string } | null;
        };
      };
    }).parent?.subscription_details?.subscription ??
    null;

  return typeof rawSubscription === "string"
    ? rawSubscription
    : rawSubscription?.id ?? null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Stripe signature ausente");
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
} catch (err: any) {
    console.error("Erro ao validar webhook:", err.message);
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 },
    );
  } 

  console.log("Webhook recebido:", event.type);

  try {
      const billingData = extractBillingEventData(event);

      const { error: billingEventInsertError } = await supabase
        .from("billing_events")
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_customer_id: billingData.stripeCustomerId,
          stripe_subscription_id: billingData.stripeSubscriptionId,
          stripe_invoice_id: billingData.stripeInvoiceId,
          company_id: billingData.companyId,
          payload: event,
          processed: false,
        });

        if (billingEventInsertError) {
          const isDuplicate =
            billingEventInsertError.code === "23505" ||
            billingEventInsertError.message?.toLowerCase().includes("duplicate") ||
            billingEventInsertError.message?.toLowerCase().includes("unique");

          if (isDuplicate) {
            return NextResponse.json({ received: true, duplicate: true });
          }

          throw billingEventInsertError;
        }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        let companyId = session.metadata?.companyId ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        if (!companyId && subscriptionId) {
          const { data: existingSubscription } = await supabase
            .from("subscriptions")
            .select("company_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          companyId = existingSubscription?.company_id ?? null;
        }

        if (!companyId) {
          console.warn("checkout.session.completed sem companyId");
          break;
        }

        let stripePriceId: string | null = null;
let status: string | null = null;
let currentPeriodStart: string | null = null;
let currentPeriodEnd: string | null = null;
let cancelAtPeriodEnd = false;
let latestInvoiceId: string | null = null;
let startedAt: string | null = null;
let trialStart: string | null = null;
let trialEnd: string | null = null;

if (subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });

  stripePriceId = subscription.items.data[0]?.price?.id ?? null;
  status = subscription.status;
  cancelAtPeriodEnd = subscription.cancel_at_period_end;

const rawCurrentPeriodStart = getSubscriptionPeriodStart(subscription);
const rawCurrentPeriodEnd = getSubscriptionPeriodEnd(subscription);

  currentPeriodStart = rawCurrentPeriodStart
    ? new Date(rawCurrentPeriodStart * 1000).toISOString()
    : null;

  currentPeriodEnd = rawCurrentPeriodEnd
    ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
    : null;

  latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id ?? null;

  startedAt = subscription.start_date
    ? new Date(subscription.start_date * 1000).toISOString()
    : null;

  trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000).toISOString()
    : null;

  trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
}

        const { error } = await supabase.from("subscriptions").upsert(
          {
            company_id: companyId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            price_id: stripePriceId,
            status: status ?? "active",
            started_at: startedAt,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            latest_invoice_id: latestInvoiceId,
            metadata: session.metadata ?? {},
            raw_payload: session,
            updated_at: new Date().toISOString(),
            trial_start: trialStart,
            trial_end: trialEnd,  
          },
          {
            onConflict: "stripe_subscription_id",
          },
        );

        if (error) {
          console.error("Erro ao inserir subscription:", error);
          throw error;
        }

        break;
      }

case "customer.subscription.created": {
  const subscription = event.data.object as Stripe.Subscription;

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

  const companyId = subscription.metadata?.companyId ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const trialStart = subscription.trial_start
  ? new Date(subscription.trial_start * 1000).toISOString()
  : null;

const trialEnd = subscription.trial_end
  ? new Date(subscription.trial_end * 1000).toISOString()
  : null;

  let resolvedCompanyId = companyId;

  if (!resolvedCompanyId) {
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("company_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    resolvedCompanyId = existingSubscription?.company_id ?? null;
  }

  if (!resolvedCompanyId) {
    throw new Error("company_id não encontrado para customer.subscription.created");
  }

  const { error } = await supabase.from("subscriptions").upsert(
    {
      company_id: resolvedCompanyId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      price_id: subscription.items.data[0]?.price?.id ?? null,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      latest_invoice_id: latestInvoiceId,
      metadata: subscription.metadata ?? {},
      raw_payload: subscription,
      updated_at: new Date().toISOString(),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      started_at: subscription.start_date
        ? new Date(subscription.start_date * 1000).toISOString()
        : null,
      trial_start: trialStart,
      trial_end: trialEnd,  
    },
    {
      onConflict: "stripe_subscription_id",
    },
  );

  if (error) {
    console.error("Erro ao criar subscription:", error);
    throw error;
  }

  break;
}

case "customer.subscription.updated":
case "customer.subscription.deleted": {
  const eventSubscription = event.data.object as Stripe.Subscription;

  const subscription = await stripe.subscriptions.retrieve(eventSubscription.id, {
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

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      stripe_customer_id: customerId,
      price_id: subscription.items.data[0]?.price?.id ?? null,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      latest_invoice_id: latestInvoiceId,
      metadata: subscription.metadata ?? {},
      raw_payload: subscription,
      updated_at: new Date().toISOString(),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      trial_start: subscription.trial_start
  ? new Date(subscription.trial_start * 1000).toISOString()
  : null,
trial_end: subscription.trial_end
  ? new Date(subscription.trial_end * 1000).toISOString()
  : null,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Erro ao atualizar subscription:", error);
    throw error;
  }

  break;
}

      case "invoice.payment_succeeded": {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  const stripePriceId =
    invoice.lines?.data?.[0]?.pricing?.type === "price_details"
      ? invoice.lines.data[0].pricing.price_details?.price ?? null
      : null;

  if (subscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    const nextStatus = stripeSubscription.status; // trialing, active, etc.

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: nextStatus,
        stripe_customer_id: customerId,
        price_id: stripePriceId,
        latest_invoice_id: invoice.id,
        raw_payload: invoice,
        updated_at: new Date().toISOString(),
        trial_start: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000).toISOString()
          : null,
        trial_end: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null,
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (error) throw error;
  }

  break;
}

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

const subscriptionId = getInvoiceSubscriptionId(invoice);

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;

        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              stripe_customer_id: customerId,
              latest_invoice_id: invoice.id,
              raw_payload: invoice,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) throw error;
        }

        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;

        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            trial_will_end_notified: true,
            trial_will_end_notified_at: new Date().toISOString(),
            trial_end: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Erro ao marcar aviso de fim do trial:", error);
          throw error;
        }

        break;
      }

      default:
        console.log("Evento ignorado:", event.type);
        break;
    }

    await supabase
      .from("billing_events")
      .update({
        processed: true,
        error: null,
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(
      "Erro ao processar webhook:",
      err instanceof Error ? err.message : err,
    );  

const errorMessage =
  err instanceof Error
    ? err.message
    : typeof err === "string"
      ? err
      : JSON.stringify(err);

await supabase
  .from("billing_events")
  .update({
    processed: false,
    error: errorMessage,
  })
  .eq("stripe_event_id", event.id);

return NextResponse.json(
  {
    error:
      err instanceof Error
        ? err.message
        : "Erro ao processar webhook",
  },
  { status: 500 },
);
  }
}