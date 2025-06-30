"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface InvoiceStatusIndicatorProps {
  status: string | null;
}

export function InvoiceStatusIndicator({
  status,
}: InvoiceStatusIndicatorProps) {
  if (!status) return null;

  const color =
    status === "autorizada"
      ? "text-green-500"
      : status === "erro"
        ? "text-red-500"
        : "text-yellow-500";
  const Icon =
    status === "autorizada" ? CheckCircle : status === "erro" ? XCircle : Clock;

  const label = status === "autorizada" ? "" : status === "erro" ? "" : "";

  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
