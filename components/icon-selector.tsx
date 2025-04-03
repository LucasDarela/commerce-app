"use client"

import { useEffect, useState } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { supabase } from "@/lib/supabase"

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
} from "@tabler/icons-react"

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
]

export function IconSelector() {
  const { companyId } = useAuthenticatedCompany()
  const [selectedIcon, setSelectedIcon] = useState("IconBeerFilled")

  useEffect(() => {
    const loadIcon = async () => {
      if (!companyId) return
      const { data, error } = await supabase
        .from("companies")
        .select("icon")
        .eq("id", companyId)
        .single()

      if (!error && data?.icon) setSelectedIcon(data.icon)
    }

    loadIcon()
  }, [companyId])

  const handleChange = async (value: string) => {
    setSelectedIcon(value)
    if (!companyId) return

    await supabase
      .from("companies")
      .update({ icon: value })
      .eq("id", companyId)
  }

  return (
    <div className="w-full">
      <label className="text-sm mb-1 block font-medium text-muted-foreground">Company Icon</label>
      <Select value={selectedIcon} onValueChange={handleChange}>
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
  )
}