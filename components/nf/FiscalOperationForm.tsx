"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Checkbox } from "../ui/checkbox";
import { Pencil, Trash } from "lucide-react";

const formSchema = z.object({
  description: z.string().optional(),
  cfop: z.string().min(2),
  ncm: z.string().length(8, "O NCM deve ter exatamente 8 dígitos"),
  pis: z.string().min(1),
  cofins: z.string().min(1),
  operation_id: z.coerce
    .number({
      invalid_type_error: "Informe o código da operação",
    })
    .min(1, "Informe o código da operação"),
  group: z.string().optional(),
  specification: z.string().optional(),
  cst_icms: z.string().optional(),
  ipi: z.string().optional(),
  state: z.string().length(2, "UF inválido").optional(),
  natureza_operacao: z.string().min(1),
  tipo_documento: z.enum(["0", "1"]),
  local_destino: z.enum(["1", "2", "3"]),
  finalidade_emissao: z.enum(["1", "2", "3", "4"]),
  consumidor_final: z.enum(["0", "1"]),
  presenca_comprador: z.enum(["0", "1", "2", "3", "4", "9"]),
  modalidade_frete: z.enum(["0", "1", "2", "9"]),
  icms_origem: z.enum(["0", "1", "2", "4", "5", "6", "7"]),
});

type FiscalOperationFormData = z.infer<typeof formSchema>;

const OPERATION_OPTIONS = [
  { label: "Venda", value: "sale" },
  { label: "Compra", value: "purchase" },
  { label: "Retorno", value: "return" },
  { label: "Correção", value: "correction" },
  { label: "Devolução", value: "devolution" },
];

export default function FiscalOperationsPage() {
  const { companyId } = useAuthenticatedCompany();
  const [operations, setOperations] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const form = useForm<FiscalOperationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      finalidade_emissao: "1",
      tipo_documento: "1",
      local_destino: "1",
      consumidor_final: "1",
      presenca_comprador: "1",
      modalidade_frete: "0",
      icms_origem: "0",
    },
  });

  const fetchOperations = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("fiscal_operations")
      .select("*")
      .eq("company_id", companyId);

    if (error) toast.error("Erro ao carregar operações fiscais");
    else setOperations(data || []);
  };

  const onSubmit = async (data: FiscalOperationFormData) => {
    if (!companyId) return;

    const { data: existing, error: fetchError } = await supabase
      .from("fiscal_operations")
      .select("id, operation_id")
      .eq("company_id", companyId)
      .eq("operation_id", data.operation_id)
      .maybeSingle();

    if (fetchError) {
      toast.error("Erro ao verificar duplicidade");
      return;
    }

    if (editId) {
      if (existing && existing.id !== editId) {
        toast.error("Já existe uma operação com esse código");
        return;
      }

      const { error } = await supabase
        .from("fiscal_operations")
        .update({ ...data, company_id: companyId })
        .eq("id", editId);

      if (error) toast.error("Erro ao atualizar operação fiscal");
      else {
        toast.success("Operação atualizada com sucesso");
        setEditId(null);
        form.reset();
        fetchOperations();
      }
    } else {
      if (existing) {
        toast.error("Já existe uma operação com esse código");
        return;
      }

      const { error } = await supabase
        .from("fiscal_operations")
        .insert({ ...data, company_id: companyId });

      if (error) toast.error("Erro ao salvar operação fiscal");
      else {
        toast.success("Operação fiscal salva");
        form.reset();
        fetchOperations();
      }
    }
  };

  const handleEdit = (op: any) => {
    setEditId(op.id);
    form.reset({ ...op });
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("fiscal_operations")
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao excluir operação");
    else {
      toast.success("Operação excluída");
      fetchOperations();
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [companyId]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
      {/* Dados NF-e */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="pb-1">Identificador</Label>
          <Input placeholder="ex: 01" {...form.register("operation_id")} />
        </div>
        <div>
          <Label className="pb-1">Tipo de Documento</Label>
          <Select
            value={form.watch("tipo_documento")}
            onValueChange={(value) =>
              form.setValue("tipo_documento", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Entrada</SelectItem>
              <SelectItem value="1">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">Finalidade da Emissão</Label>
          <Select
            value={form.watch("finalidade_emissao")}
            onValueChange={(value) =>
              form.setValue("finalidade_emissao", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Normal</SelectItem>
              <SelectItem value="2">Complementar</SelectItem>
              <SelectItem value="3">Ajuste</SelectItem>
              <SelectItem value="4">Devolução</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">Natureza da Operação</Label>
          <Input
            placeholder="ex: Venda de Produto"
            {...form.register("natureza_operacao")}
          />
        </div>

        <div>
          <Label className="pb-1">Local de Destino</Label>
          <Select
            value={form.watch("local_destino")}
            onValueChange={(value) =>
              form.setValue("local_destino", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Interna</SelectItem>
              <SelectItem value="2">Interestadual</SelectItem>
              <SelectItem value="3">Exterior</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="pb-1">Consumidor Final</Label>
          <Select
            value={form.watch("consumidor_final")}
            onValueChange={(value) =>
              form.setValue("consumidor_final", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sim" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Não</SelectItem>
              <SelectItem value="1">Sim</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">Presença do Comprador</Label>
          <Select
            value={form.watch("presenca_comprador")}
            onValueChange={(value) =>
              form.setValue("presenca_comprador", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">
                Não se aplica (por exemplo, para a Nota Fiscal complementar ou
                de ajuste)
              </SelectItem>
              <SelectItem value="1"> Operação presencial</SelectItem>
              <SelectItem value="2">
                Operação não presencial, pela Internet
              </SelectItem>
              <SelectItem value="3">
                Operação não presencial, Teleatendimento
              </SelectItem>
              <SelectItem value="4">
                NFC-e em operação com entrega em domicílio
              </SelectItem>
              <SelectItem value="9">Operação não presencial, outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">Modalidade do Frete</Label>
          <Select
            value={form.watch("modalidade_frete")}
            onValueChange={(value) =>
              form.setValue("modalidade_frete", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0"> Por conta do emitente</SelectItem>
              <SelectItem value="1"> Por conta do destinatário</SelectItem>
              <SelectItem value="2"> Por conta de terceiros</SelectItem>
              <SelectItem value="9"> Sem frete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">Origem</Label>
          <Select
            value={form.watch("icms_origem")}
            onValueChange={(value) =>
              form.setValue("icms_origem", value as any)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0"> Nacional</SelectItem>
              <SelectItem value="1">
                {" "}
                Estrangeira (importação direta)
              </SelectItem>
              <SelectItem value="2">
                {" "}
                Estrangeira (adquirida no mercado interno)
              </SelectItem>
              <SelectItem value="3">
                {" "}
                Nacional com mais de 40% de conteúdo estrangeiro
              </SelectItem>
              <SelectItem value="4">
                {" "}
                Nacional produzida através de processos produtivos básicos
              </SelectItem>
              <SelectItem value="5">
                {" "}
                Nacional com menos de 40% de conteúdo estrangeiro
              </SelectItem>
              <SelectItem value="6">
                {" "}
                Estrangeira (importação direta) sem produto nacional similar
              </SelectItem>
              <SelectItem value="7">
                {" "}
                Estrangeira (adquirida no mercado interno) sem produto nacional
                similar
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="pb-1">CFOP</Label>
          <Input {...form.register("cfop")} />
        </div>
        <div>
          <Label className="pb-1">NCM</Label>
          <Input {...form.register("ncm")} />
        </div>
        <div>
          <Label className="pb-1">PIS</Label>
          <Input {...form.register("pis")} />
        </div>
        <div>
          <Label className="pb-1">COFINS</Label>
          <Input {...form.register("cofins")} />
        </div>
        <div>
          <Label className="pb-1">CST ICMS</Label>
          <Input {...form.register("cst_icms")} />
        </div>
        <div>
          <Label className="pb-1">IPI</Label>
          <Input {...form.register("ipi")} />
        </div>
        <div>
          <Label className="pb-1">Estado (UF)</Label>
          <Input {...form.register("state")} maxLength={2} />
        </div>
      </div>

      <div className="pt-4 pb-4">
        <Button type="submit" className="mt-2 w-full md:w-auto">
          {editId ? "Atualizar Operação" : "Salvar Operação"}
        </Button>
      </div>
      <hr className="my-4" />
      {/* Lista de operações cadastradas */}
      <div className="pt-4">
        <h3 className="font-medium mb-2">Operações já cadastradas</h3>
        <ul className="space-y-1">
          {operations.map((op) => (
            <li
              key={op.id}
              className="border p-2 rounded-md flex justify-between items-center"
            >
              <div>
                <strong>
                  {op.operation_id} -{" "}
                  {op.tipo_documento === "0" ? "Entrada" : "Saída"} -{" "}
                  {op.natureza_operacao}
                </strong>{" "}
                - CFOP: {op.cfop}, CST ICMS: {op.cst_icms}, IPI: {op.ipi}, PIS:{" "}
                {op.pis}, COFINS: {op.cofins}, Estado: {op.state}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(op)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(op.id)}
                >
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
