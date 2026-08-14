"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Provider = "asaas" | "banco_inter";

type IntegrationRow = {
  provider: Provider;
  access_token: string | null;
  webhook_token: string | null;
  inter_client_id: string | null;
  inter_cert: string | null;
  env: string | null;
};

function providerLabel(p: string) {
  if (p === "asaas") return "ASAAS";
  if (p === "banco_inter") return "Banco Inter";
  return p;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const supabase = createBrowserSupabaseClient();
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Asaas form state
  const [addingAsaas, setAddingAsaas] = useState(false);
  const [asaasToken, setAsaasToken] = useState("");
  const [asaasWebhookToken, setAsaasWebhookToken] = useState("");
  const [savingAsaas, setSavingAsaas] = useState(false);

  // Inter form state
  const [addingInter, setAddingInter] = useState(false);
  const [interClientId, setInterClientId] = useState("");
  const [interClientSecret, setInterClientSecret] = useState("");
  const [interAccount, setInterAccount] = useState("");
  const [interCert, setInterCert] = useState("");
  const [interKey, setInterKey] = useState("");
  const [interEnv, setInterEnv] = useState<"sandbox" | "production">(
    "production",
  );
  const [savingInter, setSavingInter] = useState(false);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function fetchIntegrations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("company_integrations")
      .select(
        "provider, access_token, webhook_token, inter_client_id, inter_cert, env",
      );
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

  const asaasInteg = useMemo(
    () => integrations.find((i) => i.provider === "asaas"),
    [integrations],
  );
  const interInteg = useMemo(
    () => integrations.find((i) => i.provider === "banco_inter"),
    [integrations],
  );

  async function handleDisconnect(provider: Provider) {
    const label = providerLabel(provider);
    const ok = window.confirm(`Desconectar ${label}?`);
    if (!ok) return;

    setDisconnecting(provider);

    const endpoint =
      provider === "banco_inter"
        ? "/api/inter/integrations"
        : `/api/integrations?provider=${provider}`;

    const res = await fetch(endpoint, { method: "DELETE" });
    setDisconnecting(null);

    if (res.ok) {
      toast.success(`${label} desconectado!`);
      fetchIntegrations();
    } else {
      toast.error("Erro ao desconectar integração.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando integrações...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* ─── ASAAS ───────────────────────────────────────────────────────── */}
      <IntegrationCard
        label="ASAAS"
        isActive={!!asaasInteg?.access_token}
        env={asaasInteg?.env ?? null}
        onDisconnect={() => handleDisconnect("asaas")}
        disconnecting={disconnecting === "asaas"}
        isAdding={addingAsaas}
        onAddClick={() => setAddingAsaas((v) => !v)}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Access Token</span>
            <Input
              placeholder="prod_... ou test_..."
              value={asaasToken}
              onChange={(e) => setAsaasToken(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Webhook Token{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Token secreto do webhook"
                value={asaasWebhookToken}
                onChange={(e) => setAsaasWebhookToken(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAsaasWebhookToken(crypto.randomUUID())}
              >
                Gerar
              </Button>
            </div>
          </label>

          <div className="flex gap-2">
            <Button
              onClick={async () => {
                const trimmed = asaasToken.trim();
                if (!trimmed) return toast.error("Informe o token");
                setSavingAsaas(true);
                const res = await fetch("/api/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    provider: "asaas",
                    access_token: trimmed,
                    webhook_token: asaasWebhookToken.trim() || null,
                  }),
                });
                setSavingAsaas(false);
                if (res.ok) {
                  toast.success("Integração Asaas salva!");
                  setAsaasToken("");
                  setAsaasWebhookToken("");
                  setAddingAsaas(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res
                    .json()
                    .catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração");
                }
              }}
              disabled={savingAsaas}
            >
              {savingAsaas && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddingAsaas(false)}
              disabled={savingAsaas}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </IntegrationCard>

      {/* ─── BANCO INTER ─────────────────────────────────────────────────── */}
      <IntegrationCard
        label="Banco Inter"
        badge="API Cobrança V3 · mTLS"
        isActive={!!interInteg?.inter_client_id}
        env={interInteg?.env ?? null}
        onDisconnect={() => handleDisconnect("banco_inter")}
        disconnecting={disconnecting === "banco_inter"}
        isAdding={addingInter}
        onAddClick={() => setAddingInter((v) => !v)}
      >
        <div className="space-y-4">
          {/* Dica de setup */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Acesse o <strong>Internet Banking PJ</strong> do Inter
              </li>
              <li>
                Vá em <strong>Soluções para sua empresa → Integrações</strong>
              </li>
              <li>
                Crie uma nova aplicação com escopo{" "}
                <code className="bg-blue-100 px-1 rounded">
                  boleto-cobranca.write
                </code>
              </li>
              <li>
                Baixe o arquivo .zip com o <strong>Certificado (.crt)</strong> e
                a <strong>Chave Privada (.key)</strong>
              </li>
              <li>
                Copie o <strong>Client ID</strong> e{" "}
                <strong>Client Secret</strong> no painel
              </li>
            </ol>
          </div>

          {/* Ambiente */}
          <div>
            <span className="text-sm font-medium block mb-1">Ambiente</span>
            <div className="flex gap-2">
              {(["production", "sandbox"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setInterEnv(e)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    interEnv === e
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {e === "production" ? "Produção" : "Sandbox"}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">Client ID</span>
            <Input
              placeholder="Seu Client ID do portal Inter"
              value={interClientId}
              onChange={(e) => setInterClientId(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Client Secret
            </span>
            <Input
              type="password"
              placeholder="Seu Client Secret do portal Inter"
              value={interClientSecret}
              onChange={(e) => setInterClientSecret(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Número da Conta Corrente
            </span>
            <Input
              placeholder="Apenas dígitos, sem zeros à esquerda"
              value={interAccount}
              onChange={(e) =>
                setInterAccount(e.target.value.replace(/\D/g, ""))
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Certificado (.crt){" "}
              <span className="text-muted-foreground font-normal">
                — cole o conteúdo PEM
              </span>
            </span>
            <textarea
              className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={
                "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
              }
              value={interCert}
              onChange={(e) => setInterCert(e.target.value)}
            />
            <CertFileUpload
              label="Carregar arquivo .crt"
              onLoad={setInterCert}
              accept=".crt,.pem"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Chave Privada (.key){" "}
              <span className="text-muted-foreground font-normal">
                — cole o conteúdo PEM
              </span>
            </span>
            <textarea
              className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={
                "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
              }
              value={interKey}
              onChange={(e) => setInterKey(e.target.value)}
            />
            <CertFileUpload
              label="Carregar arquivo .key"
              onLoad={setInterKey}
              accept=".key,.pem"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={async () => {
                if (!interClientId.trim())
                  return toast.error("Informe o Client ID");
                if (!interClientSecret.trim())
                  return toast.error("Informe o Client Secret");
                if (!interAccount.trim())
                  return toast.error("Informe o número da conta");
                if (!interCert.includes("BEGIN CERTIFICATE"))
                  return toast.error(
                    "Certificado (.crt) inválido. Cole o conteúdo PEM completo.",
                  );
                if (
                  !interKey.includes("BEGIN") ||
                  !interKey.includes("PRIVATE KEY")
                )
                  return toast.error(
                    "Chave privada (.key) inválida. Cole o conteúdo PEM completo.",
                  );

                setSavingInter(true);
                const res = await fetch("/api/inter/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    client_id: interClientId.trim(),
                    client_secret: interClientSecret.trim(),
                    account: interAccount.trim(),
                    cert: interCert.trim(),
                    key: interKey.trim(),
                    env: interEnv,
                  }),
                });
                setSavingInter(false);

                if (res.ok) {
                  toast.success("Integração Banco Inter salva!");
                  setInterClientId("");
                  setInterClientSecret("");
                  setInterAccount("");
                  setInterCert("");
                  setInterKey("");
                  setAddingInter(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res
                    .json()
                    .catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração Inter");
                }
              }}
              disabled={savingInter}
            >
              {savingInter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Integração Inter
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddingInter(false)}
              disabled={savingInter}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </IntegrationCard>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function IntegrationCard({
  label,
  badge,
  isActive,
  env,
  onDisconnect,
  disconnecting,
  isAdding,
  onAddClick,
  children,
}: {
  label: string;
  badge?: string;
  isActive: boolean;
  env: string | null;
  onDisconnect: () => void;
  disconnecting: boolean;
  isAdding: boolean;
  onAddClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{label}</h2>
            {badge && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </div>

          {isActive ? (
            <p className="text-sm mt-1 text-green-600">
              Integração ativa ✅
              {env ? ` · ${env === "production" ? "Produção" : "Sandbox"}` : ""}
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">
              Sem credenciais cadastradas
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {isActive && (
            <Button
              onClick={onDisconnect}
              variant="destructive"
              size="sm"
              disabled={disconnecting}
            >
              {disconnecting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Desconectar
            </Button>
          )}

          <Button onClick={onAddClick} variant="outline" size="sm">
            {isAdding ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                Fechar
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                {isActive ? "Atualizar" : "Configurar"}
              </>
            )}
          </Button>
        </div>
      </div>

      {isAdding && children}
    </div>
  );
}

function CertFileUpload({
  label,
  onLoad,
  accept,
}: {
  label: string;
  onLoad: (content: string) => void;
  accept: string;
}) {
  return (
    <label className="mt-1.5 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (text) onLoad(text.trim());
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
      <span className="inline-flex items-center gap-1 underline underline-offset-2">
        📎 {label}
      </span>
    </label>
  );
}
