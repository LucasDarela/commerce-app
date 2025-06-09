"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { Checkbox } from "../ui/checkbox"
import { Pencil, Trash } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2, "Informe o nome da operação"),
    description: z.string().optional(),
    cfop: z.string().min(2),
    pis: z.string().min(1),
    cofins: z.string().min(1),
    operation_type: z.enum(["sale", "purchase", "return", "correction", "devolution"]),
    operation_id: z.coerce.number().optional(), // ou .string() dependendo do banco
    group: z.string().optional(),
    specification: z.string().optional(),
    cst_icms: z.string().optional(),
    ipi: z.string().optional(),
    state: z.string().length(2, "UF inválido").optional()
  })

type FiscalOperationFormData = z.infer<typeof formSchema>

const OPERATION_OPTIONS: { label: string; value: FiscalOperationFormData["operation_type"] }[] = [
    { label: "Venda", value: "sale" },
    { label: "Compra", value: "purchase" },
    { label: "Retorno", value: "return" },
    { label: "Correção", value: "correction" },
    { label: "Devolução", value: "devolution" },
  ]

export default function FiscalOperationsPage() {
  const { companyId } = useAuthenticatedCompany()
  const [operations, setOperations] = useState<any[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const form = useForm<FiscalOperationFormData>({
    resolver: zodResolver(formSchema),
  })
  const selected = form.watch("operation_type")

  const fetchOperations = async () => {
    if (!companyId) return
    const { data, error } = await supabase
      .from("fiscal_operations")
      .select("*")
      .eq("company_id", companyId)

    if (error) toast.error("Erro ao carregar operações fiscais")
    else setOperations(data || [])
  }

  const onSubmit = async (data: FiscalOperationFormData) => {
    if (!companyId) return
  
    const { data: existing, error: fetchError } = await supabase
      .from("fiscal_operations")
      .select("id, operation_id")
      .eq("company_id", companyId)
      .eq("operation_id", data.operation_id)
      .maybeSingle()
  
    if (fetchError) {
      toast.error("Erro ao verificar duplicidade")
      return
    }
  
    // Se está editando (editId existe)
    if (editId) {
      // Se encontrou um registro com o mesmo código mas com ID diferente
      if (existing && existing.id !== editId) {
        toast.error("Já existe uma operação com esse código")
        return
      }
  
      const { error } = await supabase
        .from("fiscal_operations")
        .update({ ...data, company_id: companyId })
        .eq("id", editId)
  
      if (error) toast.error("Erro ao atualizar operação fiscal")
      else {
        toast.success("Operação atualizada com sucesso")
        setEditId(null)
        form.reset()
        fetchOperations()
      }
    } else {
      // Se encontrou um registro com o mesmo código
      if (existing) {
        toast.error("Já existe uma operação com esse código")
        return
      }
  
      const { error } = await supabase
        .from("fiscal_operations")
        .insert({ ...data, company_id: companyId })
  
      if (error) toast.error("Erro ao salvar operação fiscal")
      else {
        toast.success("Operação fiscal salva")
        form.reset()
        fetchOperations()
      }
    }
  }

  const handleEdit = (op: any) => {
    setEditId(op.id)
    form.reset({
      ...op,
    })
  }

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("fiscal_operations").delete().eq("id", id)
    if (error) toast.error("Erro ao excluir operação")
    else {
      toast.success("Operação excluída")
      fetchOperations()
    }
  }

  useEffect(() => {
    fetchOperations()
  }, [companyId])

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Cadastro de Operações Fiscais</h2>
  
      {/* Linha completa para os checkboxes */}
      <div className="w-full">
        <Label className="mb-1 block text-sm font-medium">Tipo da Operação</Label>
        <div className="flex flex-wrap md:flex-nowrap md:gap-3 px-3 py-2 mt-1">
          {OPERATION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center space-x-1 text-sm mr-4 mb-2 md:mb-0 cursor-pointer"
            >
              <Checkbox
                checked={selected === opt.value}
                onCheckedChange={() => form.setValue("operation_type", opt.value)}
              />
              <span className="text-xs text-muted-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
  
      {/* Grid de campos */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
      >
        <div>
          <Label className="py-2">Código da Operação</Label>
          <Input {...form.register("operation_id")} />
        </div>
        <div>
          <Label className="py-2">Nome da Operação</Label>
          <Input {...form.register("name")} />
        </div>
        <div>
          <Label className="py-2">Grupo(null)</Label>
          <Input {...form.register("group")} />
        </div>
        <div>
          <Label className="py-2">Expecificação(null)</Label>
          <Input {...form.register("specification")} />
        </div>
        <div>
          <Label className="py-2">CFOP</Label>
          <Input {...form.register("cfop")} />
        </div>
        <div>
          <Label className="py-2">CST ICMS</Label>
          <Input {...form.register("cst_icms")} />
        </div>
        <div>
          <Label className="py-2">IPI</Label>
          <Input {...form.register("ipi")} />
        </div>
        <div>
          <Label className="py-2">PIS</Label>
          <Input {...form.register("pis")} />
        </div>
        <div>
          <Label className="py-2">COFINS</Label>
          <Input {...form.register("cofins")} />
        </div>
        <div className="w-full">
          <Label className="py-2">Estado</Label>
          <Select onValueChange={(val) => form.setValue("state", val)}>
                <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent className="w-full">
                <SelectItem value="AC">Acre</SelectItem>
                <SelectItem value="AL">Alagoas</SelectItem>
                <SelectItem value="AP">Amapá</SelectItem>
                <SelectItem value="AM">Amazonas</SelectItem>
                <SelectItem value="BA">Bahia</SelectItem>
                <SelectItem value="CE">Ceará</SelectItem>
                <SelectItem value="DF">Distrito Federal</SelectItem>
                <SelectItem value="ES">Espírito Santo</SelectItem>
                <SelectItem value="GO">Goiás</SelectItem>
                <SelectItem value="MA">Maranhão</SelectItem>
                <SelectItem value="MT">Mato Grosso</SelectItem>
                <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                <SelectItem value="MG">Minas Gerais</SelectItem>
                <SelectItem value="PA">Pará</SelectItem>
                <SelectItem value="PB">Paraíba</SelectItem>
                <SelectItem value="PR">Paraná</SelectItem>
                <SelectItem value="PE">Pernambuco</SelectItem>
                <SelectItem value="PI">Piauí</SelectItem>
                <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                <SelectItem value="RO">Rondônia</SelectItem>
                <SelectItem value="RR">Roraima</SelectItem>
                <SelectItem value="SC">Santa Catarina</SelectItem>
                <SelectItem value="SP">São Paulo</SelectItem>
                <SelectItem value="SE">Sergipe</SelectItem>
                <SelectItem value="TO">Tocantins</SelectItem>
                </SelectContent>
            </Select>
        </div>
  
        <div className="col-span-1 md:col-span-2">
          <Button type="submit" className="mt-2 w-full md:w-auto">
            {editId ? "Atualizar Operação" : "Salvar Operação"}
          </Button>
        </div>
      </form>
  
      {/* Lista de operações cadastradas */}
      <div className="pt-6">
        <h3 className="font-medium mb-2">Operações já cadastradas</h3>
        <ul className="space-y-1">
          {operations.map((op) => (
            <li key={op.id} className="border p-2 rounded-md flex justify-between items-center">
              <div>
                <strong>{op.operation_id} - {op.name} - ({op.operation_type})</strong> - CFOP: {op.cfop}, CST ICMS: {op.cst_icms}, IPI: {op.ipi}, PIS: {op.pis}, COFINS: {op.cofins}, Estado: {op.state}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(op)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(op.id)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
