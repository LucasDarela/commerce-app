"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

export function PlanSelectionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  const { companyId } = useAuthenticatedCompany();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    if (!companyId) return;

    async function checkSubscription() {
      try {
        const { data: sub, error } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("company_id", companyId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Erro ao verificar assinatura:", error);
          setLoading(false);
          return;
        }

        // Se não tiver assinatura ou a assinatura estiver com status vazio, pede o plano
        if (!sub || !sub.status) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [companyId, supabase]);

  const handleSelectPlan = async (priceId: string) => {
    if (!companyId) return;
    setSubmittingPlan(priceId);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, companyId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.success && data.type === "trial_started") {
        toast.success("Plano ativado com sucesso! Aproveite seus 15 dias grátis.");
        // Atualiza a tela inteira para fechar o modal e carregar o Onboarding
        window.location.reload();
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar plano.");
      setSubmittingPlan(null);
    }
  };

  const plans = [
    {
      id: "essential",
      name: "Essential",
      priceId: "price_1TKV9t4Ik5RguVVSjcoyxCkh",
      price: 197,
      description: "Ideal para organizar sua operação.",
      features: [
        "Gestão de pedidos e estoque",
        "Organização de entregas",
        "Até 2 usuários inclusos",
      ],
      trial: "15 dias de teste grátis",
    },
    {
      id: "pro",
      name: "Pro",
      priceId: "price_1TKVBe4Ik5RguVVS5gwSObQ7",
      price: 297,
      description: "O plano mais completo para gestão.",
      features: [
        "Tudo do Essential",
        "Emissão de Boletos e NF-e",
        "Controle Financeiro",
        "Até 5 usuários",
      ],
      trial: "15 dias de teste grátis",
      highlight: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      priceId: "price_1TKVER4Ik5RguVVS71L2NInl",
      price: 697,
      description: "Mentoria e acompanhamento.",
      features: [
        "Tudo do Pro",
        "Mentoria de implementação",
        "Até 15 usuários",
      ],
      trial: "Cobrança imediata",
    },
  ];

  if (loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-4xl p-0 overflow-hidden bg-background border-none shadow-2xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto w-full">
          <div className="relative">
            <div className="h-20 sm:h-24 bg-gradient-to-r from-slate-900 to-slate-800 w-full flex items-center justify-center relative overflow-hidden">
              <Sparkles className="absolute text-white/10 h-24 w-24 -right-4 -top-4 rotate-12" />
              <div className="relative z-10 text-center">
                <DialogTitle className="text-2xl font-bold text-white tracking-tight mt-4">
                  Escolha seu plano
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1 mb-4">
                  Comece agora. Sem compromisso nos planos com teste grátis.
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 bg-slate-50">
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-6 bg-white rounded-2xl shadow-sm transition-all hover:shadow-md border ${
                      plan.highlight
                        ? "border-primary ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        MAIS ESCOLHIDO
                      </span>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          R$ {plan.price}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          /mês
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-emerald-600 italic">
                        {plan.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {plan.trial}
                      </p>
                    </div>

                    <ul className="flex-1 space-y-3 mb-6 text-sm">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full font-bold shadow-sm ${
                        plan.highlight ? "" : ""
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={submittingPlan !== null}
                      onClick={() => handleSelectPlan(plan.priceId)}
                    >
                      {submittingPlan === plan.priceId
                        ? "Processando..."
                        : plan.trial.includes("teste grátis")
                        ? "Testar " + plan.name
                        : "Contratar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
