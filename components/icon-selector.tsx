"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

import {
  IconBeerFilled,
  IconShoppingCart,
  IconPackage,
  IconBuildingStore,
  IconStarFilled,
  IconCamera,
  IconCoin,
  IconSettings,
  IconCar,
  IconTruck,
  IconRocket,
} from "@tabler/icons-react";

const iconOptions = [
  { label: "Beer", value: "IconBeerFilled", icon: IconBeerFilled },
  { label: "Cart", value: "IconShoppingCart", icon: IconShoppingCart },
  { label: "Package", value: "IconPackage", icon: IconPackage },
  { label: "Store", value: "IconBuildingStore", icon: IconBuildingStore },
  { label: "Star", value: "IconStarFilled", icon: IconStarFilled },
  { label: "Camera", value: "IconCamera", icon: IconCamera },
  { label: "Coin", value: "IconCoin", icon: IconCoin },
  { label: "Settings", value: "IconSettings", icon: IconSettings },
  { label: "Car", value: "IconCar", icon: IconCar },
  { label: "Truck", value: "IconTruck", icon: IconTruck },
  { label: "Rocket", value: "IconRocket", icon: IconRocket },
];

export function IconSelector() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();

  const [selectedIcon, setSelectedIcon] = useState("IconBeerFilled");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadIcon = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("companies")
        .select("icon")
        .eq("id", companyId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Erro ao carregar ícone da empresa:", error);
      } else if (data?.icon) {
        setSelectedIcon(data.icon);
      }

      setLoading(false);
    };

    loadIcon();

    return () => {
      cancelled = true;
    };
  }, [companyId, supabase]);

  const handleChange = async (value: string) => {
    if (!companyId || saving) return;

    const previousIcon = selectedIcon;
    setSelectedIcon(value);
    setSaving(true);

    const { error } = await supabase
      .from("companies")
      .update({ icon: value })
      .eq("id", companyId);

    if (error) {
      console.error("Erro ao salvar ícone da empresa:", error);
      setSelectedIcon(previousIcon);
      toast.error("Erro ao salvar ícone da empresa.");
    } else {
      toast.success("Ícone atualizado com sucesso.");
    }

    setSaving(false);
  };

  return (
    <div className="w-full">
      <label className="text-sm mb-1 block font-medium text-muted-foreground">
        Company Icon
      </label>

      <Select
        value={selectedIcon}
        onValueChange={handleChange}
        disabled={!companyId || loading || saving}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose an icon..." />
        </SelectTrigger>

        <SelectContent>
          {iconOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon size={18} />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}