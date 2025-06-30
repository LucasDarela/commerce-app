"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ViewDanfeButtonProps {
  url: string | null; // Pode vir null do Supabase
  invoiceId: string;
  ref: string;
}

export default function ViewDanfeButton({
  url,
  invoiceId,
  ref,
}: ViewDanfeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nfe/fetch-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, invoiceId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Erro ao buscar arquivos da NF-e");
        return;
      }

      // Abre em nova aba
      window.open(result.danfeUrl, "_blank");
    } catch (err: any) {
      toast.error("Erro ao buscar DANFE: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (url && url.endsWith(".pdf")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir DANFE em PDF"
      >
        <Button variant="secondary">Ver DANFE</Button>
      </a>
    );
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={loading}>
      {loading ? "Carregando..." : "Buscar DANFE"}
    </Button>
  );
}
