"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type EquipmentForm = {
  name: string;
  code: string;
  value: string;
  stock: string;
  type: string;
  is_available: boolean;
  description: string;
};

export default function AddEquipmentPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();

  const [form, setForm] = useState<EquipmentForm>({
    name: "",
    code: "",
    value: "",
    stock: "",
    type: "",
    is_available: true,
    description: "",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = <K extends keyof EquipmentForm>(
    field: K,
    value: EquipmentForm[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "name" || field === "code"
          ? String(value).toUpperCase()
          : value,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Preencha o nome.";
    if (!form.code.trim()) return "Preencha o código.";
    if (!form.type.trim()) return "Selecione o tipo.";

    if (form.value && Number.isNaN(Number(form.value))) {
      return "Valor inválido.";
    }

    if (form.stock && Number.isNaN(Number(form.stock))) {
      return "Estoque inválido.";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (companyLoading) return;
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      const normalizedCode = form.code.trim().toUpperCase();

      const { data: existing, error: existingError } = await supabase
        .from("equipments")
        .select("id")
        .eq("company_id", companyId)
        .eq("code", normalizedCode)
        .maybeSingle();

      if (existingError) {
        console.error("Erro ao verificar duplicidade:", existingError);
        toast.error("Erro ao verificar código existente.");
        return;
      }

      if (existing) {
        toast.error("Já existe um equipamento com esse código.");
        return;
      }

      const payload = {
        company_id: companyId,
        name: form.name.trim().toUpperCase(),
        code: normalizedCode,
        value: form.value.trim() === "" ? 0 : Number(form.value),
        stock: form.stock.trim() === "" ? 0 : Number(form.stock),
        type: form.type,
        is_available: form.is_available,
        description: form.description.trim() || null,
      };

      const { error } = await supabase.from("equipments").insert(payload);

      if (error) {
        console.error("Erro ao salvar equipamento:", error);
        toast.error("Erro ao salvar equipamento.");
        return;
      }

      toast.success("Equipamento cadastrado com sucesso!");
      router.push("/dashboard/equipments");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6 overflow-x-hidden">
      <h2 className="text-xl font-bold">Cadastrar Equipamento</h2>

      <div className="space-y-2">
        <Input
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Nome *"
        />
      </div>

      <div className="space-y-2">
        <Input
          value={form.code}
          onChange={(e) => handleChange("code", e.target.value)}
          placeholder="Código *"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            type="number"
            value={form.value}
            onChange={(e) => handleChange("value", e.target.value)}
            placeholder="Valor (R$)"
          />
        </div>

        <div className="space-y-2">
          <Input
            type="number"
            value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            placeholder="Estoque"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Select
            value={form.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chopeira">Chopeira</SelectItem>
              <SelectItem value="pingadeira">Pingadeira</SelectItem>
              <SelectItem value="barril">Barril</SelectItem>
              <SelectItem value="cilindro_co2">Cilindro CO2</SelectItem>
              <SelectItem value="valvula_extratora">
                Válvula Extratora
              </SelectItem>
              <SelectItem value="valvula_reguladora">
                Válvula Reguladora
              </SelectItem>
              <SelectItem value="ferramentas">Ferramentas</SelectItem>
              <SelectItem value="conexoes">Conexões</SelectItem>
              <SelectItem value="mangueiras">Mangueiras</SelectItem>
              <SelectItem value="material_marketing">
                Materia Marketing
              </SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-baseline">
          <Checkbox
            checked={form.is_available}
            onCheckedChange={(checked) =>
              handleChange("is_available", Boolean(checked))
            }
          />
          <Label className="ml-2">Disponível</Label>
        </div>
      </div>

      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <Textarea
          className="w-full resize-y break-words"
          rows={4}
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descrição"
        />
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full mt-4"
        disabled={saving || companyLoading}
      >
        {saving ? "Salvando..." : "Salvar Equipamento"}
      </Button>
    </div>
  );
}