"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";

type Props = {
  companyId: string;
  subscriptionIdLocal?: string | null;
  currentPriceId?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  trialWillEndNotified?: boolean | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  proPlan: {
    name: string;
    stripePriceId: string;
    price: number;
    currency: string;
    interval: string;
  };
};

export default function SubscriptionManager({
  companyId,
  subscriptionIdLocal = null,
  currentPriceId = null,
  subscriptionStatus = null,
  trialEndsAt = null,
  trialWillEndNotified = null,
  cancelAtPeriodEnd = null,
  currentPeriodEnd = null,
  proPlan,
}: Props) {
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [status, setStatus] = useState<string | null>(subscriptionStatus);
const [localCancelAtPeriodEnd, setLocalCancelAtPeriodEnd] = useState<boolean>(
  cancelAtPeriodEnd ?? false,
);
const [localCurrentPeriodEnd, setLocalCurrentPeriodEnd] = useState<string | null>(
  currentPeriodEnd ?? null,
);

  useEffect(() => {
    setStatus(subscriptionStatus ?? null);
  }, [subscriptionStatus]);

  useEffect(() => {
  setLocalCancelAtPeriodEnd(cancelAtPeriodEnd ?? false);
}, [cancelAtPeriodEnd]);

useEffect(() => {
  setLocalCurrentPeriodEnd(currentPeriodEnd ?? null);
}, [currentPeriodEnd]);

  const isSubscribed = useMemo(() => {
    return status === "active" || status === "trialing";
  }, [status]);

  const isCurrentPlan = currentPriceId === proPlan.stripePriceId;

  function daysLeft(isoDate: string | null) {
    if (!isoDate) return null;
    const end = new Date(isoDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  }

  function daysUntilPeriodEnd(isoDate: string | null) {
  if (!isoDate) return null;

  const end = new Date(isoDate);
  const now = new Date();

  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(price);
  }

  function getSubscriptionStatusLabel(
  status: string | null,
  cancelAtPeriodEnd: boolean,
) {
  if (cancelAtPeriodEnd && status === "active") {
    return "Cancelando...";
  }

  switch (status) {
    case "active":
      return "Ativa";
    case "trialing":
      return "Em teste";
    case "canceled":
      return "Cancelada";
    case "past_due":
      return "Pagamento pendente";
    case "unpaid":
      return "Não paga";
    case "incomplete":
      return "Incompleta";
    case "incomplete_expired":
      return "Expirada";
    case "paused":
      return "Pausada";
    default:
      return "Sem assinatura";
  }
}

  async function handleSubscribe() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: proPlan.stripePriceId,
          companyId,
          subscriptionIdLocal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar sessão de checkout");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Sessão criada, mas a URL de checkout não foi retornada.");
    } catch (err: any) {
      setMessage(err.message || "Erro desconhecido ao iniciar assinatura.");
    } finally {
      setLoading(false);
    }
  }

async function handleReactivate() {
  if (!subscriptionIdLocal || !companyId) {
    setMessage("Dados da assinatura inválidos.");
    return;
  }

  setLoading(true);
  setMessage(null);

  try {
    const res = await fetch("/api/stripe/reactivate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionIdLocal,
        companyId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Erro ao reativar assinatura");
    }

    setLocalCancelAtPeriodEnd(false);
    setStatus(data.status ?? "active");
    setMessage(data.message || "Assinatura reativada.");
  } catch (err: any) {
    setMessage(err.message || "Erro ao reativar assinatura.");
  } finally {
    setLoading(false);
  }
}

async function handleManageBilling() {
  if (!subscriptionIdLocal || !companyId) {
    setMessage("Dados da assinatura inválidos.");
    return;
  }

  setLoading(true);
  setMessage(null);

  try {
    const res = await fetch("/api/stripe/customer-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionIdLocal,
        companyId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Erro ao abrir portal de cobrança");
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    setMessage("Não foi possível abrir o portal de cobrança.");
  } catch (err: any) {
    setMessage(err.message || "Erro ao abrir portal de cobrança.");
  } finally {
    setLoading(false);
  }
}

  const trialDays = daysLeft(trialEndsAt);
const shouldShowTrialWarning =
  status === "trialing" &&
  (
    (trialDays !== null && trialDays <= 3) ||
    trialWillEndNotified === true
  );
  const remainingDays = daysUntilPeriodEnd(localCurrentPeriodEnd);
  const realStatusLabel = getSubscriptionStatusLabel(
  status,
  localCancelAtPeriodEnd,
);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua assinatura.
        </p>
      </header>

<div className="rounded-2xl border bg-card p-6 shadow-sm">
  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-semibold">{proPlan.name}</h3>
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          {formatPrice(proPlan.price, proPlan.currency)} / {proPlan.interval}
        </span>
      </div>

      <p className="max-w-xl text-sm text-muted-foreground">
        Plano principal do sistema para operação completa do Chopp Hub.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {/* <span className="rounded-full border px-3 py-1 text-sm font-medium">
          {realStatusLabel}
        </span> */}

        {status === "active" && localCancelAtPeriodEnd && remainingDays !== null && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            Encerra em {remainingDays} dias
          </span>
        )}

        {status === "trialing" && trialDays !== null && (
  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
    Trial • faltam {trialDays} dias
  </span>
)}

        {status === "active" && !localCancelAtPeriodEnd && remainingDays !== null && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Renova em {remainingDays} dias
          </span>
        )}
      </div>
    </div>

<div className="w-full md:w-auto md:min-w-[260px]">
  {!isSubscribed ? (
    <Button
      className="h-12 w-full text-base font-semibold"
      onClick={handleSubscribe}
      disabled={loading}
    >
      {loading ? "Redirecionando..." : "Assinar Pro"}
    </Button>
  ) : localCancelAtPeriodEnd ? (
    <Button
      className="h-12 w-full bg-green-600 text-base font-semibold text-white hover:bg-green-700"
      onClick={handleReactivate}
      disabled={loading}
    >
      {loading ? "Reativando..." : "Reativar assinatura"}
    </Button>
  ) : (
    <Button
      className="h-12 w-full text-base font-semibold"
      variant="outline"
      onClick={handleManageBilling}
      disabled={loading}
    >
      {loading ? "Abrindo..." : "Atualizar informações"}
    </Button>
  )}
</div>
  </div>
</div>

<div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
    <div>
      <h4 className="font-medium">Status da assinatura</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "trialing"
          ? `Em teste${trialDays !== null ? ` — faltam ${trialDays} dias` : ""}`
          : status === "active" && localCancelAtPeriodEnd
            ? `Assinatura ativa até o fim do período${
                remainingDays !== null ? ` — faltam ${remainingDays} dias` : ""
              }${
                localCurrentPeriodEnd
                  ? ` — término em ${new Date(localCurrentPeriodEnd).toLocaleDateString("pt-BR")}`
                  : ""
              }`
            : status === "active"
              ? `Assinatura ativa${
                  remainingDays !== null ? ` — renovação em ${remainingDays} dias` : ""
                }${
                  localCurrentPeriodEnd
                    ? ` — próxima cobrança em ${new Date(localCurrentPeriodEnd).toLocaleDateString("pt-BR")}`
                    : ""
                }`
              : status === "canceled"
                ? "Sua assinatura foi encerrada."
                : status === "past_due"
                  ? "Há um problema no pagamento da assinatura."
                  : status === "unpaid"
                    ? "A assinatura está sem pagamento."
                    : status === "incomplete"
                      ? "A assinatura ainda não foi concluída."
                      : status === "incomplete_expired"
                        ? "A assinatura expirou antes de ser concluída."
                        : status === "paused"
                          ? "A assinatura está pausada."
                          : "Sem assinatura ativa"}
      </p>
    </div>

    <span className="w-fit rounded-full border px-3 py-1 text-sm font-medium">
      {realStatusLabel}
    </span>
  </div>

  {message && (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  )}
</div>

{shouldShowTrialWarning && (
  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-amber-800">
        Seu período de teste está terminando
      </h4>
      <p className="text-sm text-amber-700">
        {trialDays !== null
          ? `Faltam ${trialDays} dias para o fim do seu teste gratuito.`
          : "Seu período de teste está próximo do fim."}
      </p>
      <p className="text-sm text-amber-700">
        {trialEndsAt
          ? `A cobrança começará em ${new Date(trialEndsAt).toLocaleDateString("pt-BR")}.`
          : "Atualize suas informações de cobrança para evitar interrupções."}
      </p>
    </div>
  </div>
)}
    </div>
  );
}