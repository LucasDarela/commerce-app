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
      const res = await fetch(
        `/api/nfe/status?ref=${refId}&companyId=${companyId}`,
      );
      const { data, error } = await res.json();

      if (error) {
        toast.error("Erro ao buscar status da NF-e: " + error);
      } else if (data?.mensagem_sefaz) {
        toast(
          <div className="text-left">
            <p className="font-semibold">Mensagem da SEFAZ:</p>
            <p>{data.mensagem_sefaz}</p>
          </div>,
          {
            duration: 8000,
          },
        );
      } else {
        toast.info("NF-e não possui mensagem de rejeição.");
      }
    } catch (err: any) {
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
