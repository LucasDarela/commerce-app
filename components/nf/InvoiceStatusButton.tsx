"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface InvoiceStatusButtonProps {
  refId: string; // ref da nota
  companyId: string;
}

export function InvoiceStatusButton({
  refId,
  companyId,
}: InvoiceStatusButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nfe/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refId, companyId }),
      });
      const payload = await res.json();

      if (!res.ok) {
        const msg =
          payload?.focus?.mensagem ||
          payload?.error ||
          "Erro ao buscar status da NF-e";
        toast.error(msg);
        return;
      }

      const { updated, mensagem_sefaz } = payload as {
        updated: any;
        mensagem_sefaz?: string;
      };

      if (mensagem_sefaz) {
        toast(
          <div className="text-left">
            <p className="font-semibold">Mensagem da SEFAZ:</p>
            <p>{mensagem_sefaz}</p>
          </div>,
          { duration: 8000 },
        );
      } else {
        toast.info("NF-e não possui mensagem de rejeição.");
      }
    } catch (e: any) {
      toast.error("Erro ao consultar a NF-e.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleClick} disabled={loading}>
      {loading ? "Consultando..." : "Ver motivo da rejeição"}
    </Button>
  );
}
