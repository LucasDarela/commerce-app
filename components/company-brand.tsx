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
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();

  const [companyName, setCompanyName] = useState("My Company");
  const [iconKey, setIconKey] = useState("IconBeerFilled");

  useEffect(() => {
    let cancelled = false;

    const fetchCompany = async () => {
      if (loading || !companyId) return;

      const { data, error } = await supabase
        .from("companies")
        .select("name, icon")
        .eq("id", companyId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Erro ao buscar dados da empresa:", error);
        return;
      }

      if (data) {
        setCompanyName(data.name || "My Company");
        setIconKey(data.icon || "IconBeerFilled");
      }
    };

    fetchCompany();

    return () => {
      cancelled = true;
    };
  }, [companyId, loading, supabase]);

  const IconComponent = iconMap[iconKey] || IconBeerFilled;

  return (
    <div className="flex items-center gap-2">
      <IconComponent className="!size-5" />
      <span className="text-base font-semibold">{companyName}</span>
    </div>
  );
}