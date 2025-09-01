"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isValidCPF } from "@/lib/validators";
import { PasswordInput } from "../ui/password-input";

export default function FocusNFeSection() {
  const supabase = createClientComponentClient();
  const { companyId } = useAuthenticatedCompany();
  const [loading, setLoading] = useState(false);
  const [focusToken, setFocusToken] = useState("");
  const [cpfEmitente, setCpfEmitente] = useState("");

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
          .select("cpf_emitente")
          .eq("id", companyId)
          .maybeSingle(),
      ]);
      if (cred?.focus_token) setFocusToken(cred.focus_token);
      if (comp?.cpf_emitente) setCpfEmitente(String(comp.cpf_emitente));
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
        const { error: upCredErr } = await supabase
          .from("nfe_credentials")
          .upsert(
            { company_id: companyId, focus_token: focusToken },
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

  return (
    <div className="space-y-6  py-8">
      <h3 className="text-xl font-bold">NFe</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 w-[200px]">Token da Focus NFe</Label>
          <PasswordInput
            name="focus_token"
            value={focusToken}
            onChange={(e) => setFocusToken(e.target.value)}
            placeholder="Ex: a7ff01da-xxxx-xxxx-xxxx-44c75d490245"
          />
        </div>
        <div>
          <Label className="mb-2 w-[200px]">CPF Sócio Emitente NFe</Label>
          <PasswordInput
            name="cpf_emitente"
            value={cpfEmitente}
            onChange={(e) => setCpfEmitente(e.target.value.replace(/\D/g, ""))}
            maxLength={11}
            placeholder="Somente números (ex: 12345678909)"
          />
        </div>
      </div>
      <p className="text-sm italic text-muted-foreground">
        Para evitar erros de emissão NFe, preencha corretamente todos os campos
        acima.
      </p>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Salvando NFe..." : "Salvar NFe"}
      </Button>
    </div>
  );
}
