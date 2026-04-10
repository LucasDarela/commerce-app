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

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET não definida");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

  if (
    !stripeSubscriptionId &&
    object.parent?.subscription_details?.subscription
  ) {
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

async function resolveCompanyIdFromSubscription(
  stripeSubscriptionId: string,
  metadataCompanyId?: string | null
) {
  if (metadataCompanyId) return metadataCompanyId;

  const { data: existingSubscription, error } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return existingSubscription?.company_id ?? null;
}

async function upsertSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>,
  companyId: string
) {
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

  const startedAt = subscription.start_date
    ? new Date(subscription.start_date * 1000).toISOString()
    : null;

  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000).toISOString()
    : null;

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // IDs do Add-on Mobile Offline para verificação
  const MOBILE_OFFLINE_PRICE_IDS = [
    "price_1TKVHW4Ik5RguVVS5ugnrF9X", // Mensal
    "price_1TKVIG4Ik5RguVVSp3fOsdui", // Anual
  ];

  // IDs de Usuários Adicionais
  const EXTRA_USER_PRICE_IDS = [
    "price_1TKWbt4Ik5RguVVSc5CTvFl3", // Essential Mensal
    "price_1TKWfb4Ik5RguVVSzczGyzdG", // Essential Anual
    "price_1TKWcV4Ik5RguVVSrCaRcZ3F", // Pro Mensal
    "price_1TKWgM4Ik5RguVVS9UuOp6nH", // Pro Anual
    "price_1TKWdQ4Ik5RguVVS1KUoEx6P", // Enterprise Mensal
    "price_1TKWgu4Ik5RguVVSZmM6oYoo", // Enterprise Anual
  ];

  // Verifica se o Add-on Mobile está presente
  const isMobileEnabled = subscription.items.data.some((item) =>
    MOBILE_OFFLINE_PRICE_IDS.includes(item.price.id)
  );

  // Calcula total de assentos extras somando a quantidade dos itens correspondentes
  const extraSeats = subscription.items.data
    .filter((item) => EXTRA_USER_PRICE_IDS.includes(item.price.id))
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Encontra o item do plano principal (que não seja add-on nem assento extra)
  const mainPlanItem =
    subscription.items.data.find(
      (item) => 
        !MOBILE_OFFLINE_PRICE_IDS.includes(item.price.id) && 
        !EXTRA_USER_PRICE_IDS.includes(item.price.id)
    ) || subscription.items.data[0];

  const payload = {
    company_id: companyId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    price_id: mainPlanItem?.price?.id ?? null,
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
  };

  console.log("subscription upsert payload:", {
    companyId,
    subscriptionId: subscription.id,
    priceId: payload.price_id,
    status: payload.status,
    isMobileEnabled,
    extraSeats,
  });

  const { error } = await supabase.from("subscriptions").upsert(payload, {
    onConflict: "stripe_subscription_id",
  });

  if (error) {
    console.error("Erro ao fazer upsert da subscription:", error);
    throw error;
  }

  // Atualiza os dados da empresa (Customer ID, Flag do Mobile e Assentos Extras)
  const { error: companyUpdateError } = await supabase
    .from("companies")
    .update({
      stripe_customer_id: customerId,
      mobile_offline_enabled: isMobileEnabled,
      extra_seats: extraSeats,
    })
    .eq("id", companyId);

  if (companyUpdateError) {
    console.error(
      "Erro ao atualizar dados da empresa no webhook:",
      companyUpdateError
    );
    throw companyUpdateError;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Stripe signature ausente");
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("Erro ao validar webhook:", err.message);
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
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

        if (!subscriptionId) {
          throw new Error("checkout.session.completed sem subscriptionId");
        }

        if (!companyId) {
          companyId = await resolveCompanyIdFromSubscription(subscriptionId);
        }

        if (!companyId) {
          throw new Error("checkout.session.completed sem companyId");
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice"],
        });

        console.log("checkout.session.completed -> upsert", {
          companyId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        await upsertSubscriptionFromStripeSubscription(subscription, companyId);
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;

        const resolvedCompanyId = await resolveCompanyIdFromSubscription(
          subscription.id,
          subscription.metadata?.companyId ?? null
        );

        if (!resolvedCompanyId) {
          throw new Error(
            `company_id não encontrado para customer.subscription.created da subscription ${subscription.id}`
          );
        }

        console.log("customer.subscription.created -> upsert", {
          companyId: resolvedCompanyId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        await upsertSubscriptionFromStripeSubscription(
          subscription,
          resolvedCompanyId
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const eventSubscription = event.data.object as Stripe.Subscription;

        const subscription = await stripe.subscriptions.retrieve(
          eventSubscription.id,
          {
            expand: ["latest_invoice"],
          }
        );

        const resolvedCompanyId = await resolveCompanyIdFromSubscription(
          subscription.id,
          subscription.metadata?.companyId ?? null
        );

        if (!resolvedCompanyId) {
          throw new Error(
            `company_id não encontrado para ${event.type} da subscription ${subscription.id}`
          );
        }

        console.log(`${event.type} -> upsert`, {
          companyId: resolvedCompanyId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        await upsertSubscriptionFromStripeSubscription(
          subscription,
          resolvedCompanyId
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (!subscriptionId) {
          console.warn("invoice.payment_succeeded sem subscriptionId");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice"],
        });

        const resolvedCompanyId = await resolveCompanyIdFromSubscription(
          subscription.id,
          subscription.metadata?.companyId ?? null
        );

        if (!resolvedCompanyId) {
          throw new Error(
            `company_id não encontrado para invoice.payment_succeeded da subscription ${subscription.id}`
          );
        }

        console.log("invoice.payment_succeeded -> upsert", {
          companyId: resolvedCompanyId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        await upsertSubscriptionFromStripeSubscription(
          subscription,
          resolvedCompanyId
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (!subscriptionId) {
          console.warn("invoice.payment_failed sem subscriptionId");
          break;
        }

        const resolvedCompanyId = await resolveCompanyIdFromSubscription(
          subscriptionId
        );

        if (!resolvedCompanyId) {
          throw new Error(
            `company_id não encontrado para invoice.payment_failed da subscription ${subscriptionId}`
          );
        }

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;

        const { error } = await supabase
          .from("subscriptions")
          .upsert(
            {
              company_id: resolvedCompanyId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "past_due",
              latest_invoice_id: invoice.id,
              raw_payload: invoice,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "stripe_subscription_id",
            }
          );

        if (error) {
          console.error("Erro ao processar invoice.payment_failed:", error);
          throw error;
        }

        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;

        const resolvedCompanyId = await resolveCompanyIdFromSubscription(
          subscription.id,
          subscription.metadata?.companyId ?? null
        );

        if (!resolvedCompanyId) {
          throw new Error(
            `company_id não encontrado para customer.subscription.trial_will_end da subscription ${subscription.id}`
          );
        }

        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        const { error } = await supabase
          .from("subscriptions")
          .upsert(
            {
              company_id: resolvedCompanyId,
              stripe_subscription_id: subscription.id,
              trial_will_end_notified: true,
              trial_will_end_notified_at: new Date().toISOString(),
              trial_end: trialEnd,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "stripe_subscription_id",
            }
          );

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
      err instanceof Error ? err.message : err
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
      { status: 500 }
    );
  }
}