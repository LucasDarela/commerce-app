// components/nf/FetchLinksButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  refId: string;
  companyId: string;
  invoiceId: string; // <-- adicionado
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function FetchLinksButton({
  refId,
  companyId,
  invoiceId,
  setInvoices,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nfe/fetch-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refId, companyId, invoiceId }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.error || "Falha ao buscar XML/DANFE");
        return;
      }

      const { data } = json;
      toast.success("Links atualizados!");

      setInvoices((prev) =>
        prev.map((n) =>
          n.ref === refId
            ? {
                ...n,
                numero: data?.numero ?? n.numero,
                serie: data?.serie ?? n.serie,
                chave_nfe: data?.chave ?? n.chave_nfe,
                xml_url: data?.xml_url ?? n.xml_url,
                danfe_url: data?.danfe_url ?? n.danfe_url,
                data_emissao: data?.data_emissao ?? n.data_emissao,
                status: data?.status ?? n.status,
              }
            : n,
        ),
      );
    } catch {
      toast.error("Erro inesperado ao buscar links");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleFetch} disabled={loading}>
      {loading ? "Buscando..." : "Buscar XML/DANFE"}
    </Button>
  );
}
