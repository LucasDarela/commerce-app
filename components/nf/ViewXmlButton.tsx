"use client";

import { Button } from "@/components/ui/button";

type Props = {
  xmlUrl?: string | null;
  refId: string;
  companyId: string;
  invoiceId: string;
  onUpdated?: () => Promise<void> | void; // opcional: pra você recarregar a lista
};

export default function ViewXmlButton({
  xmlUrl,
  refId,
  companyId,
  invoiceId,
  onUpdated,
}: Props) {
  const openXml = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const handleClick = async () => {
    // Se já tem URL salva, só abre.
    if (xmlUrl) return openXml(xmlUrl);

    // Se não tem, busca no backend (que deve salvar no Supabase) e abre.
    const res = await fetch("/api/nfe/fetch-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refId, companyId, invoiceId }),
    });

    if (!res.ok) {
      console.error("Erro ao buscar links XML/DANFE");
      return;
    }

    const data = await res.json();

    // opcional: força refresh na UI
    await onUpdated?.();

    if (data?.xml_url) openXml(data.xml_url);
  };

  return (
    <Button variant="secondary" onClick={handleClick}>
      Ver XML
    </Button>
  );
}