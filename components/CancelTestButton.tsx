"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelTestButton() {
  const [loading, setLoading] = useState(false);

  const handleTestCancel = async () => {
    try {
      setLoading(true);

      // Substitua esses valores pelos de teste reais
      const ref = "12345"; // referência da NF-e
      const motivo = "Cancelamento de teste Focus NFe";
      const companyId = "SEU_COMPANY_ID_AQUI"; // id da empresa

      const res = await fetch("/api/nfe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, motivo, companyId }),
      });

      const data = await res.json();
      console.log("Resposta completa:", data);
    } catch (err) {
      console.error("Erro na requisição:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleTestCancel} disabled={loading}>
      {loading ? "Testando..." : "Testar Cancelamento"}
    </Button>
  );
}
