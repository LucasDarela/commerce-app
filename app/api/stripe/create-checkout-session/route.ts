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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req: Request) {
  try {
    const { priceId, companyId, addOnPriceId, extraSeatsQuantity = 0 } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "priceId obrigatório" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "companyId obrigatório" }, { status: 400 });
    }

    // Mapeamento de Usuário Adicional baseado no plano principal
    const EXTRA_USER_MAP: Record<string, string> = {
      // Essential (Mensal / Anual)
      "price_1TKV9t4Ik5RguVVSjcoyxCkh": "price_1TKWbt4Ik5RguVVSc5CTvFl3",
      "price_1TKVB04Ik5RguVVSiYno016o": "price_1TKWfb4Ik5RguVVSzczGyzdG",
      // Pro (Mensal / Anual)
      "price_1TKVBe4Ik5RguVVS5gwSObQ7": "price_1TKWcV4Ik5RguVVSrCaRcZ3F",
      "price_1TKVCF4Ik5RguVVS0JGxcik2": "price_1TKWgM4Ik5RguVVS9UuOp6nH",
      // Enterprise (Mensal / Anual)
      "price_1TKVER4Ik5RguVVS71L2NInl": "price_1TKWdQ4Ik5RguVVS1KUoEx6P",
      "price_1TKVFK4Ik5RguVVSL0e4G83O": "price_1TKWgu4Ik5RguVVSZmM6oYoo",
    };

    const extraUserPriceId = EXTRA_USER_MAP[priceId];

    // Configuração de IDs que permitem trial
    const TRIAL_ALLOWED_PLANS = [
      "price_1TKV9t4Ik5RguVVSjcoyxCkh", // Essential Mensal
      "price_1TKVB04Ik5RguVVSiYno016o", // Essential Anual
      "price_1TKVBe4Ik5RguVVS5gwSObQ7", // Pro Mensal
      "price_1TKVCF4Ik5RguVVS0JGxcik2", // Pro Anual
    ];

    // Regra: Só tem trial se o plano permitir E não houver Add-ons / Extras
    const canHaveTrial = TRIAL_ALLOWED_PLANS.includes(priceId) && !addOnPriceId && extraSeatsQuantity === 0;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const successUrl = `${siteUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/dashboard/billing?canceled=true`;

    const { data: existingSubscription, error: existingSubscriptionError } =
      await supabase
        .from("subscriptions")
        .select("id, status, stripe_subscription_id")
        .eq("company_id", companyId)
        .in("status", ["active", "trialing", "past_due", "unpaid"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingSubscriptionError) {
      return NextResponse.json(
        { error: existingSubscriptionError.message },
        { status: 500 }
      );
    }

    const MOBILE_OFFLINE_PRICE_IDS = [
      "price_1TKVHW4Ik5RguVVS5ugnrF9X", // Mensal
      "price_1TKVIG4Ik5RguVVSp3fOsdui", // Anual
    ];

    const EXTRA_USER_PRICE_IDS = Object.values(EXTRA_USER_MAP);

    // --- LÓGICA DE UPGRADE AUTOMÁTICO ---
    if (existingSubscription && existingSubscription.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id);
      
      // Encontra o item do plano principal (que não seja add-on)
      const mainPlanItem = sub.items.data.find(
        (item) => !MOBILE_OFFLINE_PRICE_IDS.includes(item.price.id) && !EXTRA_USER_PRICE_IDS.includes(item.price.id)
      ) || sub.items.data[0];

      const itemsToUpdate: Stripe.SubscriptionUpdateParams.Item[] = [
        { id: mainPlanItem.id, price: priceId }
      ];

      // Add-on Mobile
      if (addOnPriceId) {
        const existingMobileItem = sub.items.data.find(
          (item) => MOBILE_OFFLINE_PRICE_IDS.includes(item.price.id)
        );
        if (existingMobileItem) {
          itemsToUpdate.push({ id: existingMobileItem.id, price: addOnPriceId });
        } else {
          itemsToUpdate.push({ price: addOnPriceId });
        }
      }

      // Add-on Usuários Extras
      if (extraSeatsQuantity > 0 && extraUserPriceId) {
        const existingExtraItem = sub.items.data.find(
          (item) => EXTRA_USER_PRICE_IDS.includes(item.price.id)
        );
        if (existingExtraItem) {
          itemsToUpdate.push({ id: existingExtraItem.id, price: extraUserPriceId, quantity: extraSeatsQuantity });
        } else {
          itemsToUpdate.push({ price: extraUserPriceId, quantity: extraSeatsQuantity });
        }
      }

      await stripe.subscriptions.update(sub.id, {
        items: itemsToUpdate,
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
      });

      return NextResponse.json({ success: true, type: "upgrade" });
    }
    // --- FIM DA LÓGICA DE UPGRADE ---


    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, stripe_customer_id, email, name")  
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    let stripeCustomerId = company.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: company.email ?? undefined,
        name: company.name ?? undefined,
        metadata: { companyId },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from("companies")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", companyId);
    }

    // Prepara os itens do checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 }
    ];

    if (addOnPriceId) {
      lineItems.push({ price: addOnPriceId, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      payment_method_collection: "always",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyId },
      subscription_data: {
        trial_period_days: canHaveTrial ? 30 : undefined,
        metadata: { companyId },
      },
    });

    return NextResponse.json({ url: session.url });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Erro ao criar checkout session:", err);

    return NextResponse.json(
      {
        error: err?.raw?.message || err.message || "Erro ao criar checkout session",
        type: err?.type || null,
        code: err?.code || null,
      },
      { status: 500 }
    );
  }
}