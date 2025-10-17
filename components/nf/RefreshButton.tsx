"use client";

import { Button } from "../ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";

type Props = {
  refId: string;
  companyId: string;
  customerId: string;
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function RefreshButton({
  refId,
  customerId,
  companyId,
  setInvoices,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const supabase = createClientComponentClient<Database>();

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

      // 🔍 Buscar e-mail do cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("email")
        .eq("id", customerId)
        .maybeSingle();

      if (customerError || !customer?.email) {
        toast.error("Não foi possível recuperar o e-mail do cliente.");
        return;
      }

      const clienteEmail = customer.email;

      // sucesso
      if (payload?.mensagem_sefaz) {
        try {
          await fetch("/api/nfe/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              refId,
              toEmail: clienteEmail,
              subject: `NF-e ${refId} emitida`,
              body: `<p>Sua NF-e ${refId} foi emitida com sucesso.</p>`,
            }),
          });

          toast.success(payload.mensagem_sefaz);
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          toast.error("Erro ao enviar e-mail da NF-e.");
          window.location.reload();
        }
      } else {
        toast.success("Status atualizado!");
        window.location.reload();
      }
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
    }
  }, [companyId, refId, customerId, router, errorFromPayload, supabase]);

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
