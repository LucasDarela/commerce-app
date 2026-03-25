"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SyncAsaasButton({
  customerId,
}: {
  customerId: string | number;
}) {
  const supabase = createBrowserSupabaseClient();
  const [hasAsaasIntegration, setHasAsaasIntegration] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Verifica se a empresa do usuário atual tem integração com Asaas
  useEffect(() => {
    async function checkIntegration() {
      setLoadingCheck(true);

      // Busca company_id do usuário autenticado
      const { data: compRow, error: compErr } = await supabase
        .from("current_user_company_id")
        .select("company_id")
        .maybeSingle();

      if (compErr || !compRow?.company_id) {
        setHasAsaasIntegration(false);
        setLoadingCheck(false);
        return;
      }

      // Busca integração com provider = asaas
      const { data, error } = await supabase
        .from("company_integrations")
        .select("provider")
        .eq("company_id", compRow.company_id)
        .eq("provider", "asaas")
        .maybeSingle();

      if (!error && data?.provider === "asaas") {
        setHasAsaasIntegration(true);
      } else {
        setHasAsaasIntegration(false);
      }

      setLoadingCheck(false);
    }

    checkIntegration();
  }, [supabase]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/asaas/customers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      console.log("📦 JSON recebido no front:", json);
      if (json.asaasCustomerId) {
        console.log("✅ Cliente vinculado ao Asaas ID:", json.asaasCustomerId);
      }
      if (res.ok) {
        toast.success(
          json.created
            ? "Cliente criado no Asaas"
            : json.updated
              ? "Cliente atualizado no Asaas"
              : "Cliente já estava sincronizado",
        );
      } else {
        toast.error(json.error || "Falha ao sincronizar no Asaas");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  // Não renderiza nada se não tiver integração ou ainda carregando
  if (loadingCheck || !hasAsaasIntegration) {
    return null;
  }

  return (
    <Button onClick={handleSync} disabled={syncing}>
      {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Sync Asaas
    </Button>
  );
}
