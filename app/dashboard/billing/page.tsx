"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TrialStartButton from "@/components/subscription/TrialStartButton";

type PlanRow = {
  id: string;
  name: string;
  stripe_price_id: string;
  price: number;
  currency: string;
  interval: string;
};

  type SubscriptionRow = {
    id: string;
    company_id: string; 
    price_id: string | null;
    status: string | null;
    trial_end: string | null;
    trial_will_end_notified: boolean | null;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null;
  };

export default function BillingPage() {
  const supabase = createClientComponentClient();
  const { companyId, loading: authLoading } = useAuthenticatedCompany();

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionRow | null>(null);
  const [proPlan, setProPlan] = useState<PlanRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBillingData() {
      if (!companyId) return;

      setLoading(true);

      const [{ data: subscription, error: subscriptionError }, { data: plan, error: planError }] =
        await Promise.all([
          supabase
            .from("subscriptions")
            .select("id, company_id, price_id, status, trial_end, trial_will_end_notified, cancel_at_period_end, current_period_end") 
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("plans")
            .select("id, name, stripe_price_id, price, currency, interval")
            .ilike("name", "pro")
            .maybeSingle(),
        ]);

      if (subscriptionError) {
        console.error("Erro ao buscar assinatura:", subscriptionError);
      }

      if (planError) {
        console.error("Erro ao buscar plano Pro:", planError);
      }

      setSubscriptionData(subscription ?? null);
      setProPlan(plan ?? null);
      setLoading(false);
    }

    fetchBillingData();
  }, [companyId, supabase]);

  if (authLoading || loading) {
    return <div>Carregando assinatura...</div>;
  }

  if (!companyId) {
    return <div>Empresa não encontrada.</div>;
  }

  if (!proPlan) {
    return <div>Plano Pro não encontrado na tabela plans.</div>;
  }

  if (!subscriptionData) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-3xl font-semibold">Comece seu teste gratuito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Para liberar o acesso ao sistema, cadastre seu cartão e inicie seu teste gratuito de 30 dias.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Acesso completo por 30 dias</p>
            <p>• Cobrança somente após o período de teste</p>
            <p>• Cancelamento a qualquer momento antes da cobrança</p>
            <p>• O sistema será liberado automaticamente após a ativação</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Seu cartão será solicitado agora, mas nenhuma cobrança será feita antes do fim do período gratuito.
            </p>
          </div>

          <div className="pt-2">
            <TrialStartButton
              companyId={companyId}
              priceId={proPlan.stripe_price_id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
<SubscriptionManager
  companyId={companyId}
  subscriptionIdLocal={subscriptionData?.id ?? null}
  currentPriceId={subscriptionData?.price_id ?? null}
  subscriptionStatus={subscriptionData?.status ?? null}
  trialEndsAt={subscriptionData?.trial_end ?? null}
  cancelAtPeriodEnd={subscriptionData?.cancel_at_period_end ?? false}
  currentPeriodEnd={subscriptionData?.current_period_end ?? null}
  trialWillEndNotified={subscriptionData?.trial_will_end_notified ?? false}
  proPlan={{
    name: proPlan.name,
    stripePriceId: proPlan.stripe_price_id,
    price: proPlan.price,
    currency: proPlan.currency,
    interval: proPlan.interval,
  }}
/>
  );
}