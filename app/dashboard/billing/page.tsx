"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import TrialStartButton from "@/components/subscription/TrialStartButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

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
  updated_at?: string | null;
};

type CompanyRow = {
  billing_exempt: boolean;
};

type CompanyUserRow = {
  role: string | null;
};

export default function BillingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: authLoading } = useAuthenticatedCompany();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [userRole, setUserRole] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionRow | null>(null);
  const [proPlan, setProPlan] = useState<PlanRow | null>(null);
  const [companyData, setCompanyData] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);

  const lastFetchedCompanyIdRef = useRef<string | null>(null);

  const fetchBillingData = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!companyId) return;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Erro ao buscar usuário autenticado:", userError);
        }

        const userId = user?.id ?? null;

        const queries = await Promise.all([
          userId
            ? supabase
                .from("company_users")
                .select("role")
                .eq("company_id", companyId)
                .eq("user_id", userId)
                .maybeSingle<CompanyUserRow>()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("subscriptions")
            .select(
              "id, company_id, price_id, status, trial_end, trial_will_end_notified, cancel_at_period_end, current_period_end, updated_at"
            )
            .eq("company_id", companyId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle<SubscriptionRow>(),
          supabase
            .from("plans")
            .select("id, name, stripe_price_id, price, currency, interval")
            .ilike("name", "pro")
            .maybeSingle<PlanRow>(),
          supabase
            .from("companies")
            .select("billing_exempt")
            .eq("id", companyId)
            .maybeSingle<CompanyRow>(),
        ]);

        const [
          { data: companyUser, error: companyUserError },
          { data: subscription, error: subscriptionError },
          { data: plan, error: planError },
          { data: company, error: companyError },
        ] = queries;

        if (companyUserError) {
          console.error("Erro ao buscar role em company_users:", companyUserError);
        }

        if (subscriptionError) {
          console.error("Erro ao buscar assinatura:", subscriptionError);
        }

        if (planError) {
          console.error("Erro ao buscar plano Pro:", planError);
        }

        if (companyError) {
          console.error("Erro ao buscar empresa:", companyError);
        }

        const rawRole = companyUser?.role ?? null;

        const normalizedRole =
          rawRole === "driver"
            ? "driver"
            : rawRole === "normal"
              ? "normal"
              : rawRole;

        setUserRole(normalizedRole ?? null);
        setSubscriptionData(subscription ?? null);
        setProPlan(plan ?? null);
        setCompanyData(company ?? null);

      if (process.env.NODE_ENV === "development") {
        console.log("Billing role from company_users:", rawRole);
        console.log("Billing normalizedRole:", normalizedRole);
        console.log("Billing subscription result:", subscription);
        console.log("Billing plan result:", plan);
        console.log("Billing company result:", company);
      }
      } catch (error) {
        console.error("Erro inesperado ao buscar dados da Billing:", error);
      } finally {
        setLoading(false);
      }
    },
    [companyId, supabase]
  );

  useEffect(() => {
    if (authLoading || !companyId) return;
    if (lastFetchedCompanyIdRef.current === companyId) return;

    lastFetchedCompanyIdRef.current = companyId;
    fetchBillingData({ showLoading: true });
  }, [authLoading, companyId, fetchBillingData]);

useEffect(() => {
  if (!companyId || success !== "true") return;
  if (subscriptionData) return;

  const interval = setInterval(() => {
    fetchBillingData({ showLoading: false });
  }, 2000);

  const timeout = setTimeout(() => {
    clearInterval(interval);
  }, 15000);

  return () => {
    clearInterval(interval);
    clearTimeout(timeout);
  };
}, [companyId, success, subscriptionData, fetchBillingData]);

  if (authLoading || loading) {
    return <div>Carregando assinatura...</div>;
  }

  if (!companyId) {
    return <div>Empresa não encontrada.</div>;
  }

  if (userRole === "driver") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
              <span className="text-2xl">🔒</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Acesso indisponível
            </h1>

            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              A página de cobrança está disponível apenas para administradores e
              usuários responsáveis pela gestão da assinatura.
            </p>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Seu perfil não possui permissão para acessar esta área.
            </div>

            <div className="mt-8">
              <Button asChild className="h-11 px-6">
                <Link href="/dashboard/orders">Voltar para pedidos</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (companyData?.billing_exempt) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
              <span className="text-2xl">✓</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Sua conta está isenta de cobrança
            </h1>

            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Esta empresa foi marcada como conta interna e não precisa realizar
              pagamento para utilizar o sistema.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border p-4 text-left">
                <h3 className="font-medium">Acesso liberado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Todos os recursos permitidos para sua conta continuam
                  disponíveis normalmente.
                </p>
              </div>

              <div className="rounded-2xl border p-4 text-left">
                <h3 className="font-medium">Sem cobrança</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma assinatura Stripe será exigida para esta empresa.
                </p>
              </div>

              <div className="rounded-2xl border p-4 text-left">
                <h3 className="font-medium">Conta interna</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Essa configuração é controlada internamente no sistema.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Cobrança desativada para esta empresa.
            </div>

            <div className="mt-8">
              <Button asChild className="h-11 px-6">
                <Link href="/dashboard">Ir para o dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
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
              <h1 className="text-3xl font-semibold">
                Comece seu teste gratuito
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Para liberar o acesso ao sistema, cadastre seu cartão e inicie
                seu teste gratuito de 30 dias.
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
                Seu cartão será solicitado agora, mas nenhuma cobrança será
                feita antes do fim do período gratuito.
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
      subscriptionIdLocal={subscriptionData.id}
      currentPriceId={subscriptionData.price_id}
      subscriptionStatus={subscriptionData.status}
      trialEndsAt={subscriptionData.trial_end}
      cancelAtPeriodEnd={subscriptionData.cancel_at_period_end ?? false}
      currentPeriodEnd={subscriptionData.current_period_end ?? null}
      trialWillEndNotified={
        subscriptionData.trial_will_end_notified ?? false
      }
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