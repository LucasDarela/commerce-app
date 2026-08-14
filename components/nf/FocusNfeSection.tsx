"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isValidCPF } from "@/lib/validators";
import { PasswordInput } from "../ui/password-input";

export default function FocusNFeSection() {
  const supabase = createBrowserSupabaseClient();
  const { companyId } = useAuthenticatedCompany();
  const [loading, setLoading] = useState(false);
  const [focusToken, setFocusToken] = useState("");
  const [cpfEmitente, setCpfEmitente] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");

  useEffect(() => {
    (async () => {
      if (!companyId) return;
      const [{ data: cred }, { data: comp }] = await Promise.all([
        supabase
          .from("nfe_credentials")
          .select("focus_token")
          .eq("company_id", companyId)
          .maybeSingle(),
        supabase
          .from("companies")
          .select("cpf_emitente, document")
          .eq("id", companyId)
          .maybeSingle(),
      ]);
      if (cred?.focus_token) setFocusToken(cred.focus_token);
      if (comp?.cpf_emitente) setCpfEmitente(String(comp.cpf_emitente));
      if (comp?.document) setCompanyCnpj(String(comp.document));
    })();
  }, [companyId, supabase]);

  async function handleSave() {
    try {
      if (!companyId) return;
      setLoading(true);

      const cpfNumbers = cpfEmitente.replace(/\D/g, "");
      if (!isValidCPF(cpfNumbers)) {
        toast.error("CPF do emitente inválido");
        return;
      }

      if (focusToken) {
        if (!companyCnpj) {
          toast.error(
            "CNPJ da empresa não encontrado. Preencha os dados da empresa primeiro.",
          );
          return;
        }

        const { error: upCredErr } = await supabase
          .from("nfe_credentials")
          .upsert(
            {
              company_id: companyId,
              focus_token: focusToken,
              cnpj: companyCnpj,
            },
            { onConflict: "company_id" },
          );
        if (upCredErr) throw upCredErr;
      }

      const { error: upCompErr } = await supabase
        .from("companies")
        .update({ cpf_emitente: cpfNumbers })
        .eq("id", companyId);
      if (upCompErr) throw upCompErr;

      toast.success("Dados de NF-e salvos com sucesso!");
    } catch (e: any) {
      console.error("[FocusNFeSection] save error:", e?.message || e);
      toast.error("Erro ao salvar dados de NF-e");
    } finally {
      setLoading(false);
    }
  }

  const isConfigured = !!focusToken;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          isConfigured
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}
      >
        <span className="text-base">{isConfigured ? "✅" : "⚠️"}</span>
        <div>
          <span className="font-semibold">
            {isConfigured
              ? "Integração configurada"
              : "Integração não configurada"}
          </span>
          <span className="text-xs ml-2 opacity-75">
            {isConfigured
              ? "Token Focus NFe ativo. Emissão habilitada."
              : "Preencha o token abaixo para habilitar a emissão de NF-e."}
          </span>
        </div>
      </div>

      {/* Fields card */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="focus_token" className="font-medium">
              Token de Produção — Focus NFe
            </Label>
            <PasswordInput
              id="focus_token"
              name="focus_token"
              value={focusToken}
              onChange={(e) => setFocusToken(e.target.value)}
              placeholder="a7ff01da-xxxx-xxxx-xxxx-44c75d490245"
            />
            <p className="text-[11px] text-muted-foreground">
              Use apenas o token de <strong>produção</strong>, nunca o de
              homologação.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpf_emitente" className="font-medium">
              CPF do Sócio Emitente
            </Label>
            <Input
              id="cpf_emitente"
              name="cpf_emitente"
              value={cpfEmitente}
              onChange={(e) =>
                setCpfEmitente(e.target.value.replace(/\D/g, ""))
              }
              maxLength={11}
              placeholder="Somente dígitos — ex: 12345678909"
            />
            <p className="text-[11px] text-muted-foreground">
              CPF do responsável pela emissão das notas fiscais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? "Salvando…" : "Salvar configurações"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Preencha corretamente todos os campos para evitar erros na emissão.
          </p>
        </div>
      </div>
    </div>
  );
}
