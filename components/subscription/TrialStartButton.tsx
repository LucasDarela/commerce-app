"use client";

import { useState } from "react";
import { Button } from "../ui/button";

type Props = {
  companyId: string;
  priceId: string;
};

export default function TrialStartButton({ companyId, priceId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleStartTrial() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          companyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao iniciar teste gratuito");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Não foi possível abrir o checkout.");
    } catch (err: any) {
      setMessage(err.message || "Erro ao iniciar teste gratuito.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="h-12 px-6 text-base font-semibold"
        onClick={handleStartTrial}
        disabled={loading}
      >
        {loading ? "Redirecionando..." : "Iniciar teste gratuito"}
      </Button>

      {message && (
        <p className="text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}