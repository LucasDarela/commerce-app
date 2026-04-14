"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { 
  Check, 
  ChevronRight, 
  Smartphone, 
  Clock,
  Users
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
  mobile_offline_enabled?: boolean;
};

export default function BillingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading: authLoading } = useAuthenticatedCompany();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [userRole, setUserRole] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionRow | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [companyData, setCompanyData] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [includeMobile, setIncludeMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipTrial, setSkipTrial] = useState(false);

  const handleActivateNow = async () => {
    if (!companyId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/activate-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Assinatura ativada com sucesso! Cobrança processada.");
      fetchBillingData({ showLoading: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchBillingData = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!companyId) return;
      if (showLoading) setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? null;

        const queries = await Promise.all([
          userId ? supabase.from("company_users").select("role").eq("company_id", companyId).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from("subscriptions").select("*").eq("company_id", companyId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("plans").select("*").order("price", { ascending: true }),
          supabase.from("companies").select("billing_exempt, mobile_offline_enabled").eq("id", companyId).maybeSingle(),
        ]);

        const [userRes, subRes, plansRes, compRes] = queries;

        setUserRole(userRes.data?.role ?? null);
        setSubscriptionData(subRes.data as SubscriptionRow ?? null);
        setPlans(plansRes.data ?? []);
        setCompanyData(compRes.data ?? null);
      } catch (error) {
        console.error("Erro na Billing:", error);
      } finally {
        setLoading(false);
      }
    },
    [companyId, supabase]
  );

  useEffect(() => {
    if (!authLoading && companyId) fetchBillingData({ showLoading: true });
  }, [authLoading, companyId, fetchBillingData]);

  const [extraUsers, setExtraUsers] = useState(0);

  const handleCheckout = async (priceId: string) => {
    setSubmitting(true);
    try {
      const mobilePriceId = isYearly 
        ? "price_1TKVIG4Ik5RguVVSp3fOsdui" 
        : "price_1TKVHW4Ik5RguVVS5ugnrF9X";

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          companyId,
          addOnPriceId: includeMobile ? mobilePriceId : undefined,
          extraSeatsQuantity: extraUsers,
          skipTrial
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.success) {
        toast.success("Plano atualizado com sucesso!");
        // Aguarda 2 segundos para o Webhook processar e recarrega os dados
        setTimeout(() => {
          fetchBillingData({ showLoading: true });
        }, 2000);
        return;
      }

      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageBilling = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando cobrança...</div>;
  if (!companyId) return <div className="p-8 text-center">Empresa não encontrada.</div>;

  const currentInterval = isYearly ? "year" : "month";
  const displayedPlans = [
    plans.find(p => p.name.includes("Essential") && p.interval === currentInterval),
    plans.find(p => p.name.includes("Pro") && p.interval === currentInterval),
    plans.find(p => p.name.includes("Enterprise") && p.interval === currentInterval),
  ].filter(Boolean) as PlanRow[];

  // Define os detalhes visuais de cada plano para o Dashboard (Resumido)
  const planDetails: Record<string, { note: string; features: string[] }> = {
    Essential: {
      note: isYearly ? "Economia de 10% no anual." : "Ideal para organizar sua operação.",
      features: ["Gestão de pedidos, financeiro e estoque", "Organização de entregas", "Até 2 usuários inclusos", "E muito mais..."]
    },
    Pro: {
      note: isYearly ? "10% de desconto no plano total." : "O plano mais completo para gestão.",
      features: ["Tudo do Essential", "Emissão de Boletos e NF-e", "Controle Financeiro", "Até 5 usuários inclusos", "E muito mais..."]
    },
    Enterprise: {
      note: "Suporte e acompanhamento estratégico.",
      features: ["Tudo do Pro", "Mentoria de implementação", "Reuniões de alinhamento", "Até 15 usuários inclusos", "E muito mais..."]
    }
  };

  const currentPlan = plans.find(p => p.stripe_price_id === subscriptionData?.price_id);
  const isSubscribed = subscriptionData && subscriptionData.status !== "canceled";

  // Função para calcular dias restantes de trial
  const getTrialDaysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    const end = new Date(trialEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const trialDaysLeft = getTrialDaysLeft(subscriptionData?.trial_end || null);

  const getExtraUserPrice = () => {
    const planName = currentPlan?.name.split(" ")[0] || displayedPlans[0]?.name.split(" ")[0];
    if (planName === "Enterprise") return isYearly ? 421 : 39;
    if (planName === "Pro") return isYearly ? 529 : 49;
    return isYearly ? 637 : 59; 
  };

  const extraPrice = getExtraUserPrice();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* Banner de Status da Assinatura Atual */}
      {isSubscribed && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden relative">
          {subscriptionData?.status === "trialing" && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          )}

          <div className="space-y-2 text-center md:text-left relative z-10">
            <h2 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${subscriptionData?.status === "trialing" ? "bg-blue-500" : "bg-emerald-500"}`} />
              Sua assinatura {currentPlan?.name.split(" ")[0]} está {subscriptionData?.status === "trialing" ? "em Período de Teste" : "Ativa"}
            </h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <p className="text-sm text-muted-foreground">
                {subscriptionData?.trial_end 
                  ? `Seu teste termina em ${new Date(subscriptionData.trial_end).toLocaleDateString("pt-BR")}`
                  : subscriptionData?.current_period_end 
                    ? `Próxima renovação: ${new Date(subscriptionData.current_period_end).toLocaleDateString("pt-BR")}`
                    : "Gerencie sua assinatura"}
              </p>

              {subscriptionData?.status === "trialing" && trialDaysLeft !== null && (
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  RESTAM {trialDaysLeft} {trialDaysLeft === 1 ? "DIA" : "DIAS"}
                </div>
              )}
            </div>

            {companyData?.mobile_offline_enabled && (
              <p className="text-sm font-medium text-primary flex items-center gap-2 mt-2">
                <Smartphone className="h-4 w-4" /> Add-on Mobile Offline Ativo
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
            {subscriptionData?.status === "trialing" && (
              <Button 
                onClick={handleActivateNow} 
                disabled={submitting} 
                className="h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              >
                Ativar Agora (Pagar Agora)
              </Button>
            )}
            <Button variant="outline" onClick={handleManageBilling} disabled={submitting} className="h-11 px-6 font-semibold transition-all hover:bg-primary hover:text-primary-foreground">
              Gerenciar no Stripe (Cancelar)
            </Button>
          </div>
        </div>
      )}

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {isSubscribed ? "Mude seu plano atual" : "Escolha seu plano"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isSubscribed 
            ? "O upgrade é aplicado instantaneamente com rateio de valores." 
            : "Comece hoje mesmo com 30 dias de teste gratuito nos planos Essential e Pro."}
        </p>
        
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="flex items-center justify-center gap-4">
            <span className={!isYearly ? "font-semibold" : "text-muted-foreground text-sm"}>Mensal</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={isYearly ? "font-semibold" : "text-muted-foreground text-sm"}>Anual <span className="text-emerald-600 text-xs font-bold">(10% OFF)</span></span>
          </div>

          {!isSubscribed && (
            <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10 animate-in fade-in zoom-in duration-300">
              <input 
                type="checkbox" 
                id="skip-trial" 
                checked={skipTrial} 
                onChange={(e) => setSkipTrial(e.target.checked)}
                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="skip-trial" className="text-xs font-bold cursor-pointer select-none">
                Pular teste grátis e ATIVAR AGORA ⚡
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {displayedPlans.map((plan) => {
          const name = plan.name.split(" ")[0];
          const details = planDetails[name] || { note: "", features: [] };
          const isCurrent = subscriptionData?.price_id === plan.stripe_price_id;
          const isUpgrade = currentPlan && plan.price > currentPlan.price;
          
          let buttonText = skipTrial ? "Ativar agora" : "Iniciar teste";
          if (isSubscribed) {
            if (isCurrent) buttonText = "Plano Atual";
            else if (isUpgrade) buttonText = "Fazer Upgrade";
            else buttonText = "Mudar Plano";
          } else if (name === "Enterprise") {
            buttonText = "Contratar agora";
          }

          return (
            <div key={plan.id} className={`relative flex flex-col p-8 bg-card rounded-3xl border shadow-sm transition-all hover:shadow-md ${isCurrent ? "border-emerald-500 ring-1 ring-emerald-500" : name === "Pro" && !isSubscribed ? "border-primary ring-1 ring-primary" : ""}`}>
              {name === "Pro" && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">MAIS VENDIDO</span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">SEU PLANO</span>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold">{name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ {plan.price.toLocaleString("pt-BR")}</span>
                  <span className="text-muted-foreground text-sm">/{isYearly ? "ano" : "mês"}</span>
                </div>
                {details.note && (
                  <p className="mt-2 text-xs font-medium text-emerald-600 italic">
                    {details.note}
                  </p>
                )}
                {!isSubscribed && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {name === "Enterprise" ? "Cobrança imediata" : "30 dias de teste grátis"}
                  </p>
                )}
              </div>

              <ul className="flex-1 space-y-4 mb-8 text-sm">
                {details.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className={`h-4 w-4 ${feat.includes("muito mais") ? "text-primary" : "text-emerald-600"}`} />
                    <span className={feat.includes("muito mais") ? "font-medium text-primary" : ""}>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full h-12 text-base font-bold shadow-sm" 
                variant={isCurrent ? "secondary" : name === "Pro" ? "default" : "outline"}
                onClick={() => !isCurrent && handleCheckout(plan.stripe_price_id)}
                disabled={submitting || isCurrent}
              >
                {submitting ? "Processando..." : buttonText}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Add-on Mobile */}
        <div
          onClick={() => setIncludeMobile((prev) => !prev)}
          className={`rounded-3xl border p-6 cursor-pointer transition-all flex items-start gap-4 shadow-sm
            ${includeMobile ? "bg-primary/10 border-primary ring-1 ring-primary/20" : "bg-card border-border hover:border-primary/40"}`}
        >
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">App Mobile Offline</h3>
                <p className="text-xs text-muted-foreground leading-tight mt-1">Sincronize entregas sem internet.</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary italic">
                  R$ {isYearly ? "1.047" : "97"}
                </span>
                <p className="text-[10px] text-muted-foreground italic">/{isYearly ? "ano" : "mês"}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Incluir recurso</span>
              <Checkbox checked={includeMobile || !!companyData?.mobile_offline_enabled} disabled={!!companyData?.mobile_offline_enabled} className="h-5 w-5 rounded-md" />
            </div>
          </div>
        </div>

        {/* Add-on Usuários Extras */}
        <div className="rounded-3xl border border-border bg-card p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold">Usuários Extras</h3>
                <p className="text-xs text-muted-foreground leading-tight mt-1">Expanda sua equipe operacional.</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary italic">R$ {extraPrice}</span>
                <p className="text-[10px] text-muted-foreground italic">/{isYearly ? "ano" : "mês"} cada</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-4 bg-primary/5 p-2 rounded-2xl border border-primary/10 w-fit">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); setExtraUsers(Math.max(0, extraUsers - 1)); }}
              >
                -
              </Button>
              <span className="font-bold text-lg min-w-[24px] text-center">{extraUsers}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); setExtraUsers(extraUsers + 1); }}
              >
                +
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 italic font-medium">
              * Seu plano atual inclui {currentPlan?.name.includes("Enterprise") ? 15 : currentPlan?.name.includes("Pro") ? 5 : 2} usuários base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}