"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";

type PlanKey = "basic" | "starter" | "enterprise";

type Props = {
  companyId: string;
  subscriptionIdLocal?: string | null; // uuid local, if exists
  currentPriceId?: string | null; // stripe price id
  currentPlan?: PlanKey | null; // basic | starter | enterprise
  subscriptionStatus?: string | null; // trialing | active | past_due | canceled | null
  trialEndsAt?: string | null; // ISO string
  // Map your real stripe price IDs here (replace placeholders)
  priceMap?: Record<PlanKey, string>;
};

export default function SubscriptionManager({
  companyId,
  subscriptionIdLocal = null,
  currentPriceId = null,
  currentPlan = null,
  subscriptionStatus = null,
  trialEndsAt = null,
  priceMap = {
    basic: "price_1S6Kw4QNqXSYsdzdD9COGFqm",
    starter: "price_1S6KvZQNqXSYsdzdn8EUNFyQ",
    enterprise: "price_1S6KvmQNqXSYsdzdHUWgixCD",
  },
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [status, setStatus] = useState<string | null>(
    subscriptionStatus ?? null,
  );
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [localPlan, setLocalPlan] = useState<PlanKey | null>(
    currentPlan ?? null,
  );

  const priceToLabel = (p: PlanKey) => {
    if (p === "basic") return "Basic — R$100";
    if (p === "starter") return "Starter — R$300";
    return "Enterprise — R$400";
  };

  function daysLeft(isoDate: string | null) {
    if (!isoDate) return null;
    const end = new Date(isoDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  }

  async function createCheckout(priceId: string, planKey: PlanKey) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          subscriptionIdLocal,
          companyId,
          // you can pass customerEmail if you want
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Erro ao criar sessão de checkout");

      // redirect to stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage("Sessão criada, mas não recebi URL de redirecionamento.");
      }
    } catch (err: any) {
      setMessage(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(plan: PlanKey) {
    const priceId = priceMap[plan];
    if (!priceId) return setMessage("priceId não configurado para esse plano");
    await createCheckout(priceId, plan);
  }

  async function handleUpgrade(targetPlan: PlanKey) {
    // If current is enterprise, block
    if (localPlan === "enterprise")
      return setMessage("Plano Enterprise não pode ser atualizado");
    // If same plan, do nothing
    if (localPlan === targetPlan) return setMessage("Você já está nesse plano");

    // create checkout for new plan (Stripe Billing will prorate/handle upgrade if configured)
    await createCheckout(priceMap[targetPlan], targetPlan);
  }

  async function handleCancel() {
    if (!subscriptionIdLocal)
      return setMessage("Subscription local não encontrada.");
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stripe/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionIdLocal }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Erro ao cancelar assinatura");

      setStatus("canceled");
      setMessage("Assinatura cancelada com sucesso.");
      setShowCancelConfirm(false);
    } catch (err: any) {
      setMessage(err.message || "Erro desconhecido ao cancelar");
    } finally {
      setLoading(false);
    }
  }

  const planLabel = (plan: PlanKey | null) => {
    if (!plan) return "Sem plano";
    if (plan === "basic") return "Basic";
    if (plan === "starter") return "Starter";
    return "Enterprise";
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Gerenciamento de Assinatura</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Administre seu plano, atualize ou cancele quando quiser.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plan cards */}
        {(["basic", "starter", "enterprise"] as PlanKey[]).map((plan) => {
          const selected = localPlan === plan;

          // Define se é upgrade ou downgrade
          let actionLabel = "Inscrever-se";
          if (!selected && localPlan) {
            const planOrder: PlanKey[] = ["basic", "starter", "enterprise"];
            const currentIndex = planOrder.indexOf(localPlan);
            const targetIndex = planOrder.indexOf(plan);
            actionLabel = targetIndex > currentIndex ? "Upgrade" : "Downgrade";
          }

          return (
            <div
              key={plan}
              className={`p-4 rounded-2xl shadow-sm border ${selected ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
            >
              <h3 className="text-lg font-medium">{priceToLabel(plan)}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {plan === "basic"
                  ? "Recursos básicos para começar"
                  : plan === "starter"
                    ? "Recursos avançados para crescimento"
                    : "Solução completa para empresas"}
              </p>

              <div className="mt-4 space-y-2">
                {/* show action Buttons */}
                {status !== "active" && (
                  <Button
                    className="w-full disabled:opacity-60"
                    onClick={() => {
                      setLoadingPlan(plan);
                      handleSubscribe(plan).finally(() => setLoadingPlan(null));
                    }}
                    disabled={loadingPlan === plan || selected}
                  >
                    {selected ? "Atual" : actionLabel}
                  </Button>
                )}

                {status === "active" && selected && (
                  <div className="space-y-2">
                    <span className="block text-sm">Plano atual</span>
                    {plan !== "enterprise" && (
                      <Button
                        className="w-full py-2 rounded-lg bg-yellow-600 text-white font-semibold hover:bg-yellow-700"
                        onClick={() =>
                          setMessage(
                            "Use o botão de Upgrade para escolher outro plano",
                          )
                        }
                      >
                        Gerenciar
                      </Button>
                    )}
                    <Button
                      className="w-full py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancelar Assinatura
                    </Button>
                  </div>
                )}

                {status === "active" && !selected && (
                  <Button
                    className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                    onClick={() => {
                      setLoadingPlan(plan);
                      handleUpgrade(plan).finally(() => setLoadingPlan(null));
                    }}
                    disabled={
                      loadingPlan === plan || localPlan === "enterprise"
                    }
                  >
                    {loadingPlan === plan
                      ? "Carregando..."
                      : "Upgrade para este plano"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-white">
        <h4 className="font-medium">Status da Assinatura</h4>
        <p className="mt-2 text-sm text-slate-600">
          {status === "trialing"
            ? `Em teste — plano ${planLabel(localPlan)} — faltam ${daysLeft(trialEndsAt)} dias`
            : status
              ? `Plano ${planLabel(localPlan)} — ${status}`
              : "Sem assinatura"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {message && (
            <div className="text-sm text-red-600 flex-1 min-w-[150px]">
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="flex mt-3 justify-end">
        <Button
          className="flex-shrink-0 bg-gray-200 hover:bg-red-600"
          onClick={() => setShowCancelConfirm(true)}
        >
          Cancelar assinatura
        </Button>
      </div>

      {/* Cancel confirmation modal (simple) */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCancelConfirm(false)}
          />
          <div className="relative max-w-md w-full bg-white rounded-2xl p-6 shadow-lg">
            <h5 className="text-lg font-semibold">Confirmar cancelamento</h5>
            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que deseja cancelar sua assinatura? O cancelamento
              pode ser revertido entrando em contato com o suporte.
            </p>

            <div className="mt-4 flex gap-3">
              <Button
                className="flex-1 py-2 rounded-lg "
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-red-600 text-white"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
