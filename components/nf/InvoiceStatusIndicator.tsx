"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";

interface InvoiceStatusIndicatorProps {
  status: string | null;
}

export function InvoiceStatusIndicator({
  status,
}: InvoiceStatusIndicatorProps) {
  if (!status) return null;

  let color = "text-red-500";
  let Icon = XCircle;

  // Define label com inicial maiúscula
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  if (status === "autorizado") {
    color = "text-green-600";
    Icon = CheckCircle;
  } else if (status === "processando") {
    color = "text-yellow-500";
    Icon = Clock;
  } else if (status === "cancelado" || status === "inutilizado") {
    color = "text-red-600";
    Icon = XCircle;
  } else {
    color = "text-red-600";
    Icon = XCircle;
  }

  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <span className={`text-sm ${color}`}>{label}</span>
    </div>
  );
}
