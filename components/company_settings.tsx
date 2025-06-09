"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { PasswordInput } from "./ui/password-input"

export default function CompanySettingsForm() {
  const { companyId } = useAuthenticatedCompany()
  const [loading, setLoading] = useState(false)

  const [focusToken, setFocusToken] = useState("")

  const [formData, setFormData] = useState({
    document: "",
    corporate_name: "",
    trade_name: "",
    zip_code: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    number: "",
    complement: "",
    phone: "",
    email: "",
    state_registration: "",
  })

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) return
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single()

      if (error) {
        toast.error("Erro ao buscar dados da empresa")
        return
      }

      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value ?? ""])
        )
      }))
    }
    fetchCompany()
  }, [companyId])

  const handleCnpjSearch = async () => {
    if (formData.document.length !== 14) {
      toast.error("CNPJ deve conter 14 dígitos")
      return
    }

    try {
      const res = await fetch(`/api/cnpj/${formData.document}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Erro ao buscar CNPJ")

      setFormData((prev) => ({
        ...prev,
        corporate_name: data.razao_social,
        trade_name: data.nome_fantasia,
        zip_code: data.cep,
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.municipio,
        state: data.uf,
        number: data.numero,
      }))
    } catch (err: any) {
      toast.error("Erro ao buscar dados do CNPJ")
      console.error(err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { error } = await supabase
      .from("companies")
      .update(formData)
      .eq("id", companyId)

    if (error) {
      toast.error("Erro ao atualizar dados da empresa")
      return
    }

    toast.success("Dados da empresa atualizados com sucesso")

// Dentro do handleSubmit
if (focusToken) {
  const { error: insertError } = await supabase
    .from("nfe_credentials")
    .upsert({
      company_id: companyId,
      cnpj: formData.document,
      focus_token: focusToken,
    }, {
      onConflict: 'company_id' 
    })

  if (insertError) {
    toast.error("Erro ao salvar dados de NF-e")
    return
  }

  toast.success("Dados de NF-e salvos com sucesso!")
}
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Configure os dados da sua empresa</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
        <div>
          <Label className="mb-2">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              name="document"
              value={formData.document}
              onChange={handleChange}
              placeholder="Digite o CNPJ"
            />
            <Button type="button" onClick={handleCnpjSearch}>
              Buscar
            </Button>
          </div>
        </div>
        <div>
          <Label className="mb-2">Nome Completo / Razão Social</Label>
          <Input name="corporate_name" value={formData.corporate_name} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Nome Fantasia</Label>
          <Input name="trade_name" value={formData.trade_name} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">CEP</Label>
          <Input name="zip_code" value={formData.zip_code} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Endereço</Label>
          <Input name="address" value={formData.address} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Bairro</Label>
          <Input name="neighborhood" value={formData.neighborhood} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Cidade</Label>
          <Input name="city" value={formData.city} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Estado</Label>
          <Input name="state" value={formData.state} onChange={handleChange} maxLength={2} />
        </div>
        <div>
          <Label className="mb-2">Número</Label>
          <Input name="number" value={formData.number} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Complemento</Label>
          <Input name="complement" value={formData.complement} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Telefone</Label>
          <Input name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Email (Opcional)</Label>
          <Input name="email" value={formData.email} onChange={handleChange} />
        </div>
        <div>
          <Label className="mb-2">Inscrição Estadual</Label>
          <Input
            name="state_registration"
            value={formData.state_registration}
            onChange={handleChange}
          />
        </div>
        <div>
  <Label className="mb-2 w-[200px]">Token da Focus NFe</Label>
  <Input
  name="focus_token"
    value={focusToken}
    onChange={(e) => setFocusToken(e.target.value)}
    placeholder="Ex: a7ff01da-xxxx-xxxx-xxxx-44c75d490245"
  />
</div>
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="mt-4">
        {loading ? "Salvando..." : "Salvar Empresa"}
      </Button>
    </div>
  )
}
