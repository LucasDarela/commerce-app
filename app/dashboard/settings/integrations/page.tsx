"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type Provider = "mercado_pago" | "asaas";

type IntegrationRow = {
  provider: Provider;
  access_token: string | null;
  webhook_token: string | null;
};

function providerLabel(p: string) {
  if (p === "mercado_pago") return "Mercado Pago";
  if (p === "asaas") return "ASAAS";
  return p;
}

// Heurística leve só para alertar o usuário se colou token do provedor "errado"
function detectProviderFromToken(token: string): Provider | "unknown" {
  const t = token.trim();
  // Mercado Pago costuma ser APP_USR-xxxxx ou TEST-xxxxx
  if (/^(APP_USR|TEST)-[A-Za-z0-9-_]+$/i.test(t)) return "mercado_pago";
  // ASAAS costuma ser prod_xxx... ou test_xxx...
  if (/^(prod|test)_[A-Za-z0-9]{20,}$/i.test(t)) return "asaas";
  return "unknown";
}

export default function IntegrationsPage() {
  const supabase = createClientComponentClient();
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addingNew, setAddingNew] = useState(false);
  const [provider, setProvider] = useState<Provider>("mercado_pago");
  const [token, setToken] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function fetchIntegrations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("company_integrations")
      .select("provider, access_token, webhook_token");
    if (error) {
      console.error(error);
      toast.error("Erro ao buscar integrações");
    } else {
      setIntegrations((data ?? []) as IntegrationRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const hasAny = useMemo(
    () => integrations.some((i) => !!i.access_token),
    [integrations],
  );

  if (loading) return <div>Carregando integrações...</div>;

  return (
    <div className="space-y-6 py-8">
      <h1 className="text-xl font-bold">Integrações</h1>

      {/* Lista cada provider encontrado */}
      {integrations.map((row) => {
        const active = !!row.access_token;
        return (
          <div
            key={row.provider}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {providerLabel(row.provider)}
                </h2>
                {active ? (
                  <p className="text-sm mt-1 text-green-600">
                    Integração ativa ✅
                  </p>
                ) : (
                  <p className="text-sm mt-1 text-muted-foreground">
                    Sem token cadastrado
                  </p>
                )}
              </div>

              {active && (
                <Button
                  onClick={async () => {
                    const ok = window.confirm(
                      `Desconectar ${providerLabel(row.provider)}?`,
                    );
                    if (!ok) return;
                    setDisconnecting(row.provider);
                    const res = await fetch(
                      `/api/integrations?provider=${row.provider}`,
                      { method: "DELETE" },
                    );
                    setDisconnecting(null);
                    if (res.ok) {
                      toast.success("Integração desconectada!");
                      fetchIntegrations();
                    } else {
                      toast.error("Erro ao desconectar integração.");
                    }
                  }}
                  variant="destructive"
                  disabled={disconnecting === row.provider}
                >
                  {disconnecting === row.provider && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Desconectar
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Se nenhuma ativa, call-to-action */}
      {!hasAny && !addingNew && (
        <div className="rounded-lg border p-4">
          <p className="mb-4 text-amber-600">Nenhuma integração ativa.</p>
          <Button onClick={() => setAddingNew(true)} className="bg-primary">
            Adicionar Integração
          </Button>
        </div>
      )}

      {/* Form para adicionar/atualizar integração */}
      {addingNew && (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-xl font-semibold">Adicionar Integração</h2>

          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as Provider)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecionar provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
              <SelectItem value="asaas">ASAAS</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Access Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <Input
              placeholder="Webhook Token"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setWebhookToken(crypto.randomUUID())}
            >
              Gerar
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={async () => {
                const trimmed = token.trim();
                if (!trimmed) return toast.error("Informe o token");

                const guessed = detectProviderFromToken(trimmed);
                if (guessed !== "unknown" && guessed !== provider) {
                  const proceed = window.confirm(
                    `O token parece ser de ${providerLabel(guessed)}, mas você selecionou ${providerLabel(provider)}. Continuar mesmo assim?`,
                  );
                  if (!proceed) return;
                }

                setSaving(true);
                const res = await fetch("/api/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    provider,
                    access_token: token.trim(),
                    webhook_token: webhookToken.trim() || null,
                  }),
                });
                setSaving(false);

                if (res.ok) {
                  toast.success("Integração salva!");
                  setToken("");
                  setWebhookToken("");
                  setAddingNew(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res
                    .json()
                    .catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração");
                }
              }}
              className="bg-primary"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>

            <Button
              variant="outline"
              onClick={() => setAddingNew(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
