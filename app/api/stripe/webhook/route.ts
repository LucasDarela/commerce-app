// app/api/stripe/webhook/route.ts
import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: any, res: any) {
  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"]!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const subscription = event.data.object as Stripe.Subscription;
  const companyId = subscription.metadata?.companyId;
  const subscriptionIdLocal = subscription.metadata?.subscriptionIdLocal;

  const periodEnd = (subscription as any).current_period_end;
  const timestamp = periodEnd ? periodEnd * 1000 : null;

  if (!companyId) return res.status(200).send("OK");

  // Atualiza status e price_id no Supabase
  if (
    [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  ) {
    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        current_period_end: new Date((periodEnd ?? 0) * 1000).toISOString(),
      })
      .eq("id", subscriptionIdLocal);
  }

  res.status(200).send("OK");
}
