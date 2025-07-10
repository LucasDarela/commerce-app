// components/nf/RefreshButton.tsx
"use client";

import { Button } from "../ui/button";
import { toast } from "sonner";

type Props = {
  refId: string;
  companyId: string;
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function RefreshButton({
  refId,
  companyId,
  setInvoices,
}: Props) {
  const handleRefresh = async () => {
    const res = await fetch("/api/nfe/status", {
      method: "POST",
      body: JSON.stringify({
        ref: refId,
        companyId: companyId,
      }),
    });

    if (res.ok) {
      const { updated } = await res.json();
      toast.success("Status atualizado!");

      setInvoices((prev) =>
        prev.map((n) => (n.ref === refId ? { ...n, ...updated } : n)),
      );
    } else {
      toast.error("Erro ao atualizar status da nota");
    }
  };

  return (
    <Button variant="secondary" onClick={handleRefresh}>
      Atualizar Status
    </Button>
  );
}
