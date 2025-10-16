"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCanEmitNfe } from "@/hooks/useCanEmitNfe";

export default function EmitNfeButton({
  orderId,
  customerId,
  emitNfFromOrder,
  emitNfFromCustomer,
}: {
  orderId?: string;
  customerId?: string | null;
  emitNfFromOrder?: boolean | null;
  emitNfFromCustomer?: boolean | null;
}) {
  const router = useRouter();
  const { canEmit, loading, error } = useCanEmitNfe({
    orderId,
    customerId,
    emitNfFromOrder,
    emitNfFromCustomer,
  });

  if (loading)
    return (
      <Button disabled variant="outline" className="w-full">
        Verificando NF-e...
      </Button>
    );

  if (!canEmit) {
    return (
      <Button
        variant="outline"
        disabled
        title={error || "Cliente não habilitado para emissão de NF-e"}
        className="w-full"
      >
        Emitir NF-e
      </Button>
    );
  }

  return (
    <Button
      onClick={() => router.push(`/dashboard/orders/${orderId}/nfe`)}
      className="w-full"
    >
      Emitir NF-e
    </Button>
  );
}
