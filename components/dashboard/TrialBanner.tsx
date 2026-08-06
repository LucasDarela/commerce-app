"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function TrialBanner() {
  const { subscriptionStatus, trialEnd, loading } = useAuthenticatedCompany();

  const trialDaysLeft = useMemo(() => {
    if (!trialEnd) return null;
    const end = new Date(trialEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [trialEnd]);

  if (loading || subscriptionStatus !== "trialing" || trialDaysLeft === null) {
    return null;
  }

  return (
    <div className="w-full bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-center text-sm">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
        <Clock className="w-4 h-4" />
        <span>
          Você está em período de teste. Seu teste termina em {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"}.
        </span>
        <Link 
          href="/dashboard/billing" 
          className="ml-2 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 font-bold"
        >
          Assinar Agora
        </Link>
      </div>
    </div>
  );
}
