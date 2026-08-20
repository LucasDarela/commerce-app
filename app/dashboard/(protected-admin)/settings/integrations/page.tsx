"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ChevronDown, ChevronUp, AlertCircle, Eye, EyeOff } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Provider = "asaas" | "banco_inter" | "sicoob";

type IntegrationRow = {
  provider: Provider;
  access_token: string | null;
  webhook_token: string | null;
  inter_client_id: string | null;
  inter_cert: string | null;
  sicoob_client_id: string | null;
  sicoob_numero_contrato: number | null;
  env: string | null;
};

function providerLabel(p: string) {
  if (p === "asaas") return "ASAAS";
  if (p === "banco_inter") return "Banco Inter";
  if (p === "sicoob") return "Sicoob";
  return p;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const supabase = createBrowserSupabaseClient();
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Asaas form
  const [addingAsaas, setAddingAsaas] = useState(false);
  const [asaasToken, setAsaasToken] = useState("");
  const [asaasWebhookToken, setAsaasWebhookToken] = useState("");
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [showAsaasToken, setShowAsaasToken] = useState(false);
  const [showAsaasWebhookToken, setShowAsaasWebhookToken] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);


  // Inter form
  const [addingInter, setAddingInter] = useState(false);
  const [interClientId, setInterClientId] = useState("");
  const [interClientSecret, setInterClientSecret] = useState("");
  const [interAccount, setInterAccount] = useState("");
  const [interCert, setInterCert] = useState("");
  const [interKey, setInterKey] = useState("");
  const [interEnv, setInterEnv] = useState<"sandbox" | "production">("production");
  const [savingInter, setSavingInter] = useState(false);

  // Sicoob form
  const [addingSicoob, setAddingSicoob] = useState(false);
  const [sicoobClientId, setSicoobClientId] = useState("");
  const [sicoobCert, setSicoobCert] = useState("");
  const [sicoobKey, setSicoobKey] = useState("");
  const [sicoobNumeroContrato, setSicoobNumeroContrato] = useState("");
  const [sicoobNumeroConta, setSicoobNumeroConta] = useState("");
  const [sicoobEnv, setSicoobEnv] = useState<"sandbox" | "production">("production");
  const [savingSicoob, setSavingSicoob] = useState(false);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function fetchIntegrations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("company_integrations")
      .select(
        "provider, access_token, webhook_token, inter_client_id, inter_cert, sicoob_client_id, sicoob_numero_contrato, env",
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

  const asaasInteg = useMemo(() => integrations.find((i) => i.provider === "asaas"), [integrations]);
  const interInteg = useMemo(() => integrations.find((i) => i.provider === "banco_inter"), [integrations]);
  const sicoobInteg = useMemo(() => integrations.find((i) => i.provider === "sicoob"), [integrations]);

  // Determina qual provedor está ativo
  const activeProvider: Provider | null = asaasInteg?.access_token
    ? "asaas"
    : interInteg?.inter_client_id
    ? "banco_inter"
    : sicoobInteg?.sicoob_client_id
    ? "sicoob"
    : null;

  async function handleDisconnect(provider: Provider) {
    const label = providerLabel(provider);
    const ok = window.confirm(`Desconectar ${label}?`);
    if (!ok) return;

    setDisconnecting(provider);
    const endpoint =
      provider === "banco_inter"
        ? "/api/inter/integrations"
        : provider === "sicoob"
        ? "/api/sicoob/integrations"
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
      {/* ─── Banner de exclusividade ──────────────────────────────────────── */}
      {activeProvider && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Apenas um provedor de boleto por vez</p>
            <p className="mt-0.5 text-amber-700">
              O provedor <strong>{providerLabel(activeProvider)}</strong> está ativo. Para configurar outro, desconecte o atual primeiro.
            </p>
          </div>
        </div>
      )}

      {/* ─── ASAAS ───────────────────────────────────────────────────────── */}
      <IntegrationCard
        label="ASAAS"
        isActive={!!asaasInteg?.access_token}
        env={asaasInteg?.env ?? null}
        onDisconnect={() => handleDisconnect("asaas")}
        disconnecting={disconnecting === "asaas"}
        isAdding={addingAsaas}
        onAddClick={() => {
          if (!addingAsaas) {
            setAsaasToken(asaasInteg?.access_token || "");
            setAsaasWebhookToken(asaasInteg?.webhook_token || "");
          }
          setAddingAsaas((v) => !v);
        }}
        blockedBy={activeProvider !== null && activeProvider !== "asaas" ? providerLabel(activeProvider) : null}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Access Token</span>
            <div className="relative">
              <Input
                type={showAsaasToken ? "text" : "password"}
                placeholder="prod_... ou test_..."
                value={asaasToken}
                onChange={(e) => setAsaasToken(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAsaasToken(!showAsaasToken)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showAsaasToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">
              Webhook Token{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAsaasWebhookToken ? "text" : "password"}
                  placeholder="Token secreto do webhook"
                  value={asaasWebhookToken}
                  onChange={(e) => setAsaasWebhookToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAsaasWebhookToken(!showAsaasWebhookToken)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showAsaasWebhookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (asaasInteg?.webhook_token) {
                    setShowGenerateConfirm(true);
                  } else {
                    setAsaasWebhookToken(crypto.randomUUID());
                    setShowAsaasWebhookToken(true);
                  }
                }}
              >
                Gerar
              </Button>
            </div>
          </label>

          <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerar novo token?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você deseja gerar um novo token? Isso irá sobrescrever seu token já ativo e precisará ser atualizado no painel do Asaas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setAsaasWebhookToken(crypto.randomUUID());
                  setShowAsaasWebhookToken(true);
                }}>
                  Sim, gerar token
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button
              onClick={async () => {
                const trimmed = asaasToken.trim();
                if (!trimmed) return toast.error("Informe o token");
                setSavingAsaas(true);
                const res = await fetch("/api/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ provider: "asaas", access_token: trimmed, webhook_token: asaasWebhookToken.trim() || null }),
                });
                setSavingAsaas(false);
                if (res.ok) {
                  toast.success("Integração Asaas salva!");
                  setAsaasToken(""); setAsaasWebhookToken(""); setAddingAsaas(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res.json().catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração");
                }
              }}
              disabled={savingAsaas}
            >
              {savingAsaas && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setAddingAsaas(false)} disabled={savingAsaas}>
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
        blockedBy={activeProvider !== null && activeProvider !== "banco_inter" ? providerLabel(activeProvider) : null}
      >
        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse o <strong>Internet Banking PJ</strong> do Inter</li>
              <li>Vá em <strong>Soluções para sua empresa → Integrações</strong></li>
              <li>Crie uma nova aplicação com escopo <code className="bg-blue-100 px-1 rounded">boleto-cobranca.write</code></li>
              <li>Baixe o arquivo .zip com o <strong>Certificado (.crt)</strong> e a <strong>Chave Privada (.key)</strong></li>
              <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> no painel</li>
            </ol>
          </div>

          <div>
            <span className="text-sm font-medium block mb-1">Ambiente</span>
            <div className="flex gap-2">
              {(["production", "sandbox"] as const).map((e) => (
                <button key={e} type="button" onClick={() => setInterEnv(e)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${interEnv === e ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}>
                  {e === "production" ? "Produção" : "Sandbox"}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">Client ID</span>
            <Input placeholder="Seu Client ID do portal Inter" value={interClientId} onChange={(e) => setInterClientId(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Client Secret</span>
            <Input type="password" placeholder="Seu Client Secret do portal Inter" value={interClientSecret} onChange={(e) => setInterClientSecret(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Número da Conta Corrente</span>
            <Input placeholder="Apenas dígitos, sem zeros à esquerda" value={interAccount} onChange={(e) => setInterAccount(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Certificado (.crt) <span className="text-muted-foreground font-normal">— cole o conteúdo PEM</span></span>
            <textarea className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              value={interCert} onChange={(e) => setInterCert(e.target.value)} />
            <CertFileUpload label="Carregar arquivo .crt" onLoad={setInterCert} accept=".crt,.pem" />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Chave Privada (.key) <span className="text-muted-foreground font-normal">— cole o conteúdo PEM</span></span>
            <textarea className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              value={interKey} onChange={(e) => setInterKey(e.target.value)} />
            <CertFileUpload label="Carregar arquivo .key" onLoad={setInterKey} accept=".key,.pem" />
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={async () => {
                if (!interClientId.trim()) return toast.error("Informe o Client ID");
                if (!interClientSecret.trim()) return toast.error("Informe o Client Secret");
                if (!interAccount.trim()) return toast.error("Informe o número da conta");
                if (!interCert.includes("BEGIN CERTIFICATE")) return toast.error("Certificado (.crt) inválido.");
                if (!interKey.includes("BEGIN") || !interKey.includes("PRIVATE KEY")) return toast.error("Chave privada (.key) inválida.");
                setSavingInter(true);
                const res = await fetch("/api/inter/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ client_id: interClientId.trim(), client_secret: interClientSecret.trim(), account: interAccount.trim(), cert: interCert.trim(), key: interKey.trim(), env: interEnv }),
                });
                setSavingInter(false);
                if (res.ok) {
                  toast.success("Integração Banco Inter salva!");
                  setInterClientId(""); setInterClientSecret(""); setInterAccount(""); setInterCert(""); setInterKey(""); setAddingInter(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res.json().catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração Inter");
                }
              }}
              disabled={savingInter}
            >
              {savingInter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Integração Inter
            </Button>
            <Button variant="outline" onClick={() => setAddingInter(false)} disabled={savingInter}>Cancelar</Button>
          </div>
        </div>
      </IntegrationCard>

      {/* ─── SICOOB ──────────────────────────────────────────────────────── */}
      <IntegrationCard
        label="Sicoob"
        badge="API Cobrança V3 · mTLS"
        isActive={!!sicoobInteg?.sicoob_client_id}
        env={sicoobInteg?.env ?? null}
        onDisconnect={() => handleDisconnect("sicoob")}
        disconnecting={disconnecting === "sicoob"}
        isAdding={addingSicoob}
        onAddClick={() => setAddingSicoob((v) => !v)}
        blockedBy={activeProvider !== null && activeProvider !== "sicoob" ? providerLabel(activeProvider) : null}
      >
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            <p className="font-semibold mb-1">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse <a href="https://developers.sicoob.com.br" target="_blank" rel="noopener noreferrer" className="underline">developers.sicoob.com.br</a> e cadastre-se</li>
              <li>Crie uma nova aplicação com escopo <code className="bg-green-100 px-1 rounded">cobranca_boletos_incluir</code></li>
              <li>Obtenha o <strong>Client ID</strong> da aplicação</li>
              <li>Solicite à sua cooperativa o <strong>Número do Contrato</strong> e o certificado digital (PFX/A1)</li>
              <li>Extraia o <strong>.crt</strong> e <strong>.key</strong> do PFX: <code className="bg-green-100 px-1 rounded text-xs">openssl pkcs12 -in cert.pfx -nokeys -out cert.crt</code></li>
            </ol>
          </div>

          <div>
            <span className="text-sm font-medium block mb-1">Ambiente</span>
            <div className="flex gap-2">
              {(["production", "sandbox"] as const).map((e) => (
                <button key={e} type="button" onClick={() => setSicoobEnv(e)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${sicoobEnv === e ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}>
                  {e === "production" ? "Produção" : "Sandbox"}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">Client ID</span>
            <Input placeholder="Client ID gerado no portal Sicoob Developers" value={sicoobClientId} onChange={(e) => setSicoobClientId(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium mb-1 block">Número do Contrato</span>
              <Input placeholder="Ex: 12345678" value={sicoobNumeroContrato} onChange={(e) => setSicoobNumeroContrato(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="text-sm font-medium mb-1 block">Número da Conta Corrente</span>
              <Input placeholder="Ex: 8765432" value={sicoobNumeroConta} onChange={(e) => setSicoobNumeroConta(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Certificado (.crt) <span className="text-muted-foreground font-normal">— cole o conteúdo PEM</span></span>
            <textarea className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              value={sicoobCert} onChange={(e) => setSicoobCert(e.target.value)} />
            <CertFileUpload label="Carregar arquivo .crt" onLoad={setSicoobCert} accept=".crt,.pem" />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Chave Privada (.key) <span className="text-muted-foreground font-normal">— cole o conteúdo PEM</span></span>
            <textarea className="w-full min-h-[120px] font-mono text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              value={sicoobKey} onChange={(e) => setSicoobKey(e.target.value)} />
            <CertFileUpload label="Carregar arquivo .key" onLoad={setSicoobKey} accept=".key,.pem" />
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={async () => {
                if (!sicoobClientId.trim()) return toast.error("Informe o Client ID");
                if (!sicoobNumeroContrato.trim()) return toast.error("Informe o Número do Contrato");
                if (!sicoobNumeroConta.trim()) return toast.error("Informe o Número da Conta Corrente");
                if (!sicoobCert.includes("BEGIN CERTIFICATE")) return toast.error("Certificado (.crt) inválido.");
                if (!sicoobKey.includes("BEGIN") || !sicoobKey.includes("PRIVATE KEY")) return toast.error("Chave privada (.key) inválida.");
                setSavingSicoob(true);
                const res = await fetch("/api/sicoob/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    client_id: sicoobClientId.trim(),
                    cert: sicoobCert.trim(),
                    key: sicoobKey.trim(),
                    numero_contrato: Number(sicoobNumeroContrato),
                    numero_conta: Number(sicoobNumeroConta),
                    env: sicoobEnv,
                  }),
                });
                setSavingSicoob(false);
                if (res.ok) {
                  toast.success("Integração Sicoob salva!");
                  setSicoobClientId(""); setSicoobCert(""); setSicoobKey(""); setSicoobNumeroContrato(""); setSicoobNumeroConta(""); setAddingSicoob(false);
                  fetchIntegrations();
                } else {
                  const { error } = await res.json().catch(() => ({ error: "" }));
                  toast.error(error || "Erro ao salvar integração Sicoob");
                }
              }}
              disabled={savingSicoob}
            >
              {savingSicoob && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Integração Sicoob
            </Button>
            <Button variant="outline" onClick={() => setAddingSicoob(false)} disabled={savingSicoob}>Cancelar</Button>
          </div>
        </div>
      </IntegrationCard>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function IntegrationCard({
  label, badge, isActive, env, onDisconnect, disconnecting, isAdding, onAddClick, blockedBy, children,
}: {
  label: string;
  badge?: string;
  isActive: boolean;
  env: string | null;
  onDisconnect: () => void;
  disconnecting: boolean;
  isAdding: boolean;
  onAddClick: () => void;
  blockedBy: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-4 ${blockedBy ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{label}</h2>
            {badge && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{badge}</span>
            )}
          </div>

          {isActive ? (
            <p className="text-sm mt-1 text-green-600">
              Integração ativa ✅{env ? ` · ${env === "production" ? "Produção" : "Sandbox"}` : ""}
            </p>
          ) : blockedBy ? (
            <p className="text-sm mt-1 text-amber-600">
              Bloqueado — desconecte o {blockedBy} primeiro
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">Sem credenciais cadastradas</p>
          )}
        </div>

        <div className="flex gap-2">
          {isActive && (
            <Button onClick={onDisconnect} variant="destructive" size="sm" disabled={disconnecting}>
              {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desconectar
            </Button>
          )}

          <Button onClick={onAddClick} variant="outline" size="sm" disabled={!!blockedBy && !isActive}>
            {isAdding ? (
              <><ChevronUp className="mr-1 h-4 w-4" />Fechar</>
            ) : (
              <><ChevronDown className="mr-1 h-4 w-4" />{isActive ? "Atualizar" : "Configurar"}</>
            )}
          </Button>
        </div>
      </div>

      {isAdding && children}
    </div>
  );
}

function CertFileUpload({ label, onLoad, accept }: { label: string; onLoad: (content: string) => void; accept: string }) {
  return (
    <label className="mt-1.5 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
      <input type="file" accept={accept} className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => { const text = ev.target?.result as string; if (text) onLoad(text.trim()); };
          reader.readAsText(file);
          e.target.value = "";
        }} />
      <span className="inline-flex items-center gap-1 underline underline-offset-2">📎 {label}</span>
    </label>
  );
}
