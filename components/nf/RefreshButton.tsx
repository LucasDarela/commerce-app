"use client";

import { Button } from "../ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const errorFromPayload = useCallback((payload: any): string => {
    return (
      payload?.focus?.mensagem ||
      payload?.mensagem_sefaz ||
      payload?.message ||
      payload?.error ||
      "Erro ao atualizar status da nota"
    );
  }, []);

  const doFetch = useCallback(async () => {
    // timeout de 20s
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 20_000);

    try {
      const res = await fetch("/api/nfe/status", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refId, companyId }),
        signal: abortRef.current.signal,
      });

      const payload = await res.json().catch(() => ({}));

      if (res.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(errorFromPayload(payload));
      }

      // sucesso
      if (payload?.mensagem_sefaz) {
        toast.success(payload.mensagem_sefaz);
      } else {
        toast.success("Status atualizado!");
      }
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null; // <- limpa
    }
  }, [companyId, refId, router, errorFromPayload]);

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await doFetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao comunicar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [doFetch, loading]);

  return (
    <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
      {loading ? "Atualizando..." : "Atualizar Status"}
    </Button>
  );
}
