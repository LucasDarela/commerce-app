"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  const { companyId, loading } = useAuthenticatedCompany();
  const [companyName, setCompanyName] = useState("My Company");
  const [iconKey, setIconKey] = useState("IconBeerFilled");

  useEffect(() => {
    const fetchCompany = async () => {
      if (loading || !companyId) return;
      const { data, error } = await supabase
        .from("companies")
        .select("name, icon")
        .eq("id", companyId)
        .single();

      if (!error && data) {
        setCompanyName(data.name);
        setIconKey(data.icon || "IconBeerFilled");
      }
    };

    fetchCompany();
  }, [companyId]);

  const IconComponent = iconMap[iconKey] || IconBeerFilled;

  return (
    <div className="flex items-center gap-2">
      <IconComponent className="!size-5" />
      <span className="text-base font-semibold">{companyName}</span>
    </div>
  );
}
