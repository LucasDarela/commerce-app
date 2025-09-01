"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface InvoiceStatusIndicatorProps {
  status: string | null;
  companyId?: string;
}

export function InvoiceStatusIndicator({
  status,
}: InvoiceStatusIndicatorProps) {
  if (!status) return null;

  const color =
    status === "autorizado"
      ? "text-green-500"
      : status === "erro_autorizacao"
        ? "text-red-500"
        : "text-yellow-500";
  const Icon =
    status === "autorizada"
      ? CheckCircle
      : status === "erro_autorizacao"
        ? XCircle
        : Clock;

  const label =
    status === "autorizado" ? "" : status === "erro_autorizacao" ? "" : "";

  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
