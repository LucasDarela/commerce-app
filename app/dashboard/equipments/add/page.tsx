"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"

export default function AddEquipmentPage() {
  const { companyId } = useAuthenticatedCompany()
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    code: "",
    value: "",
    stock: "",
    type: "",
    is_available: true,
    description: "",
  })

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!companyId) return toast.error("Empresa não identificada.");
  
    if (!form.name || !form.code || !form.type) {
      return toast.error("Preencha os campos obrigatórios.");
    }
  
    // 🔎 Verifica se já existe um equipamento com o mesmo código para a empresa
    const { data: existing, error: fetchError } = await supabase
      .from("equipments")
      .select("id")
      .eq("code", form.code)
      .eq("company_id", companyId)
      .maybeSingle();
  
    if (fetchError) {
      console.error("Erro ao verificar duplicação:", fetchError);
      return toast.error("Erro ao verificar código existente.");
    }
  
    if (existing) {
      return toast.error("Já existe um equipamento com esse código.");
    }
  
    // ✅ Se não existir, insere
    const { error } = await supabase.from("equipments").insert({
      ...form,
      value: Number(form.value),
      stock: Number(form.stock),
      company_id: companyId,
    });
  
    if (error) {
      toast.error("Erro ao salvar equipamento.");
      console.error(error);
    } else {
      toast.success("Equipamento cadastrado com sucesso!");
      router.push("/dashboard/equipments");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6 overflow-x-hidden">
      <h2 className="text-xl font-bold">Cadastrar Equipamento</h2>

      <div className="space-y-2">
        <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nome *" />
      </div>

      <div className="space-y-2">
        <Input value={form.code} onChange={(e) => handleChange("code", e.target.value)} placeholder="Código *" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input type="number" value={form.value} onChange={(e) => handleChange("value", e.target.value)} placeholder="Valor (R$)" />
        </div>

        <div className="space-y-2">
          <Input type="number" value={form.stock} onChange={(e) => handleChange("stock", e.target.value)} placeholder="Estoque"/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Select value={form.type} onValueChange={(value) => handleChange("type", value)}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="chopeira">Chopeira</SelectItem>
                <SelectItem value="pingadeira">Pingadeira</SelectItem>
                <SelectItem value="barril">Barril</SelectItem>
                <SelectItem value="cilindro_co2">Cilindro CO2</SelectItem>
                <SelectItem value="valvula_extratora">Válvula Extratora</SelectItem>
                <SelectItem value="valvula_reguladora">Válvula Reguladora</SelectItem>
                <SelectItem value="ferramentas">Ferramentas</SelectItem>
                <SelectItem value="conexoes">Conexões</SelectItem>
                <SelectItem value="mangueiras">Mangueiras</SelectItem>
                <SelectItem value="material_marketing">Materia Marketing</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
                
            </SelectContent>
            </Select>
        </div>

        <div className="flex items-center justify-baseline">
            <Checkbox checked={form.is_available} onCheckedChange={(checked) => handleChange("is_available", checked)} />
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

      <Button onClick={handleSubmit} className="w-full mt-4">Salvar Equipamento</Button>
    </div>
  )
}