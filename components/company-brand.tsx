"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

import {
  IconBeerFilled,
  IconShoppingCart,
  IconPackage,
  IconBuildingStore,
  IconStarFilled,
} from "@tabler/icons-react";

const iconMap: Record<string, React.ElementType> = {
  IconBeerFilled,
  IconShoppingCart,
  IconPackage,
  IconBuildingStore,
  IconStarFilled,
};

export function CompanyBrand() {
  const { companyName, companyId, loading } = useAuthenticatedCompany();
  const [iconKey, setIconKey] = useState("IconBeerFilled");

  // O ícone ainda pode ser buscado aqui ou vindo do hook no futuro
  // Por ora, mantemos a lógica simples para garantir estabilidade
  const IconComponent = iconMap[iconKey] || IconBeerFilled;

  if (loading && !companyName) return <div className="h-5 w-32 bg-muted animate-pulse rounded" />;

  return (
    <div className="flex items-center gap-2">
      <IconComponent className="!size-5" />
      <span className="text-base font-semibold">{companyName || "My Company"}</span>
    </div>
  );
}