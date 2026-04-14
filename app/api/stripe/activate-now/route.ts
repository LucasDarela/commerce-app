export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "companyId obrigatório" }, { status: 400 });
    }

    const { data: subRow, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("company_id", companyId)
      .eq("status", "trialing")
      .maybeSingle();

    if (subError || !subRow?.stripe_subscription_id) {
      return NextResponse.json({ error: "Assinatura em teste não encontrada para esta empresa." }, { status: 404 });
    }

    // Atualiza no Stripe para encerrar o trial agora
    await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      trial_end: "now",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao ativar assinatura agora:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
