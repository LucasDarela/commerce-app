"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";

export default function BillingPage() {
  const supabase = createClientComponentClient();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    async function fetchSubscription() {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Erro ao buscar assinatura:", error);
        return;
      }

      setSubscriptionData(data);
    }

    fetchSubscription();
  }, []);

  if (!subscriptionData) return <div>Carregando assinatura...</div>;

  // Mapear o price_id para uma chave de plano
  let currentPlan: "basic" | "starter" | "enterprise" | null = null;
  if (subscriptionData.price_id?.includes("BASIC")) currentPlan = "basic";
  else if (subscriptionData.price_id?.includes("STARTER"))
    currentPlan = "starter";
  else if (subscriptionData.price_id?.includes("ENTERPRISE"))
    currentPlan = "enterprise";

  return (
    <SubscriptionManager
      companyId={subscriptionData.company_id} // caso precise passar
      subscriptionIdLocal={subscriptionData.id}
      currentPriceId={subscriptionData.price_id}
      currentPlan={currentPlan}
      subscriptionStatus={subscriptionData.status}
      trialEndsAt={subscriptionData.trial_end}
    />
  );
}
