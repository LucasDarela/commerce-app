"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function IntegrationsPage() {
  const supabase = createClientComponentClient();
  const [integration, setIntegration] = useState<null | {
    provider: string;
    access_token: string;
  }>(null);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [provider, setProvider] = useState("mercado_pago");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();

  async function fetchIntegration() {
    const { data, error } = await supabase
      .from("company_integrations")
      .select("provider, access_token")
      .eq("provider", "mercado_pago")
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Erro ao buscar integração");
    }

    setIntegration(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchIntegration();
  }, []);

  if (loading) return <div>Carregando integrações...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Integrações</h1>

      {integration && integration.access_token && !addingNew ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold">Mercado Pago</h2>
            <p className="text-sm mt-1 text-green-600">Integração ativa ✅</p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={async () => {
                const confirm = window.confirm(
                  "Deseja realmente desconectar esta integração?",
                );
                if (!confirm) return;

                setDisconnecting(true);
                const res = await fetch(
                  `/api/integrations?provider=${provider}`,
                  { method: "DELETE" },
                );
                setDisconnecting(false);

                if (res.ok) {
                  toast.success("Integração desconectada com sucesso!");
                  setIntegration(null);
                  setAddingNew(false);
                } else {
                  toast.error("Erro ao desconectar integração.");
                }
              }}
              variant="destructive"
              disabled={disconnecting}
            >
              {disconnecting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Desconectar
            </Button>
          </div>
        </div>
      ) : addingNew ? (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-xl font-semibold">Adicionar Integração</h2>

          <Select value={provider} onValueChange={setProvider} disabled>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
              <SelectItem value="asaas" disabled>
                Asaas (em breve)
              </SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Access Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />

          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!token) return toast.error("Informe o token");

                setSaving(true);
                const res = await fetch("/api/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ provider, access_token: token }),
                });
                setSaving(false);

                if (res.ok) {
                  toast.success("Integração salva!");
                  fetchIntegration();
                  setAddingNew(false);
                } else {
                  toast.error("Erro ao salvar integração");
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
      ) : (
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Mercado Pago</h2>
          <p className="mb-4 text-red-600">Nenhuma integração ativa.</p>

          <Button onClick={() => setAddingNew(true)} className="bg-primary">
            Adicionar Integração
          </Button>
        </div>
      )}
    </div>
  );
}
