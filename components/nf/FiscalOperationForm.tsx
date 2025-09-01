"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Pencil, Trash } from "lucide-react";

/** ---------- Schema ---------- */
const formSchema = z
  .object({
    description: z.string().optional(),
    cfop: z.string().min(2),
    ncm: z.string().length(8, "O NCM deve ter exatamente 8 dígitos"),
    pis: z.string().optional().nullable(),
    cofins: z.string().optional().nullable(),
    operation_id: z.coerce.number().min(1),
    group: z.string().optional(),
    specification: z.string().optional(),

    // ICMS/CSOSN (digitável)
    icms_situacao_tributaria: z.string().min(1, "Informe o ICMS/CSOSN"),

    // se usar CST/CSOSN separados na sua tabela, mantemos opcionais aqui
    cst_icms: z.string().optional(),
    csosn_icms: z.string().optional(),

    ipi: z.string().optional().nullable(),
    state: z.string().length(2, "UF inválido").optional(),
    natureza_operacao: z.string().min(1),

    tipo_documento: z.enum(["0", "1"]),
    local_destino: z.enum(["1", "2", "3"]),
    finalidade_emissao: z.enum(["1", "2", "3", "4"]),
    consumidor_final: z.enum(["0", "1"]),
    presenca_comprador: z.enum(["0", "1", "2", "3", "4", "9"]),
    modalidade_frete: z.enum(["0", "1", "2", "9"]),
    icms_origem: z.enum(["0", "1", "2", "4", "5", "6", "7"]),

    // ST: opcionais no schema base, mas exigidos quando ICMS=60
    vbc_st_ret: z.string().optional(),
    pst: z.string().optional(),
    vicms_substituto: z.string().optional(),
    vicms_st_ret: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.icms_situacao_tributaria?.trim() === "60") {
      (
        ["vbc_st_ret", "pst", "vicms_substituto", "vicms_st_ret"] as const
      ).forEach((k) => {
        if (!val[k] || val[k]!.toString().trim() === "") {
          ctx.addIssue({
            path: [k],
            code: "custom",
            message: "Obrigatório quando ICMS = 60 (ST).",
          });
        }
      });
    }
  });

type FiscalOperationFormData = z.infer<typeof formSchema>;

/** ---------- Utils ---------- */
const pad2 = (v?: string | number | null) =>
  v == null ? undefined : v.toString().padStart(2, "0");

/** ---------- Componente ---------- */
export default function FiscalOperationForm() {
  const { companyId } = useAuthenticatedCompany();

  // 1=SN, 2=SN sublimite, 3=Normal, 4=MEI
  const [crt, setCrt] = useState<number | null>(null);
  const isSN = useMemo(() => crt === 1 || crt === 2 || crt === 4, [crt]);

  const [operations, setOperations] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

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
      icms_situacao_tributaria: "", // importante
      // demais começam vazios/undefined
    },
  });

  /** Regime tributário da empresa */
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("companies")
      .select("regime_tributario")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        setCrt(data?.regime_tributario ?? null);
      });
  }, [companyId]);

  /** Busca operações já salvas */
  const fetchOperations = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("fiscal_operations")
      .select("*")
      .eq("company_id", companyId);

    if (error) toast.error("Erro ao carregar operações fiscais");
    else setOperations(data || []);
  };
  useEffect(() => {
    fetchOperations();
  }, [companyId]);

  /** Submit */
  const onSubmit = async (data: FiscalOperationFormData) => {
    if (!companyId) return;

    // regra: monta tudo, mas só envia campos conhecidos
    const full = {
      ...data,
      company_id: companyId,
      cst_icms: isSN ? null : pad2(data.cst_icms),
      csosn_icms: isSN ? (data.csosn_icms ?? "") : null,
      pis: pad2(data.pis),
      cofins: pad2(data.cofins),
      ipi: pad2(data.ipi),
    };

    // ❗️Se a sua tabela ainda não tem as novas colunas, REMOVA-AS do payload aqui.
    // Deixe somente campos que você tem certeza que existem.
    const allow: (keyof typeof full)[] = [
      "company_id",
      "operation_id",
      "natureza_operacao",
      "tipo_documento",
      "local_destino",
      "finalidade_emissao",
      "consumidor_final",
      "presenca_comprador",
      "modalidade_frete",
      "icms_origem",
      "cfop",
      "ncm",
      "pis",
      "cofins",
      "ipi",
      "state",
      // acrescente as de baixo SOMENTE se você já criou as colunas no banco:
      "icms_situacao_tributaria",
      "vbc_st_ret",
      "pst",
      "vicms_substituto",
      "vicms_st_ret",
      "cst_icms",
      "csosn_icms",
      "description",
      "group",
      "specification",
    ];
    const payload = Object.fromEntries(
      Object.entries(full).filter(([k, _]) => allow.includes(k as any)),
    );

    // se NÃO for ST, limpe os campos de ST para evitar erro de tipo
    if (full.icms_situacao_tributaria?.trim() !== "60") {
      delete (payload as any).vbc_st_ret;
      delete (payload as any).pst;
      delete (payload as any).vicms_substituto;
      delete (payload as any).vicms_st_ret;
    }

    console.log("[fiscal_operations] payload =>", payload);

    // checa duplicidade do operation_id
    const { data: existing, error: fetchError } = await supabase
      .from("fiscal_operations")
      .select("id, operation_id")
      .eq("company_id", companyId)
      .eq("operation_id", data.operation_id)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
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
        .update(payload)
        .eq("id", editId)
        .select(); // força o PostgREST retornar erro detalhado

      if (error) {
        console.error("[UPDATE fiscal_operations] =>", error);
        toast.error(`Erro ao atualizar operação fiscal: ${error.message}`);
      } else {
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
        .insert(payload)
        .select();

      if (error) {
        console.error("[INSERT fiscal_operations] =>", error);
        toast.error(`Erro ao salvar operação fiscal: ${error.message}`);
      } else {
        toast.success("Operação fiscal salva");
        form.reset();
        fetchOperations();
      }
    }
  };

  /** Editar */
  const handleEdit = (row: any) => {
    setEditId(row.id);
    form.reset({
      ...row,
      // garante strings
      icms_situacao_tributaria: String(row.icms_situacao_tributaria ?? ""),
      cst_icms: row.cst_icms ?? undefined,
      csosn_icms: row.csosn_icms ?? undefined,
      vbc_st_ret: row.vbc_st_ret ?? undefined,
      pst: row.pst ?? undefined,
      vicms_substituto: row.vicms_substituto ?? undefined,
      vicms_st_ret: row.vicms_st_ret ?? undefined,
    });
  };

  /** Excluir */
  const handleDelete = async (id: string) => {
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

  const icms = form.watch("icms_situacao_tributaria")?.trim();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="pb-1">Identificador</Label>
          <Input placeholder="ex: 01" {...form.register("operation_id")} />
        </div>

        <div>
          <Label className="pb-1">Tipo de Documento</Label>
          <Select
            value={form.watch("tipo_documento")}
            onValueChange={(v) => form.setValue("tipo_documento", v as any)}
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
            onValueChange={(v) => form.setValue("finalidade_emissao", v as any)}
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
            onValueChange={(v) => form.setValue("local_destino", v as any)}
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
            onValueChange={(v) => form.setValue("consumidor_final", v as any)}
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
            onValueChange={(v) => form.setValue("presenca_comprador", v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Não se aplica</SelectItem>
              <SelectItem value="1">Operação presencial</SelectItem>
              <SelectItem value="2">Internet</SelectItem>
              <SelectItem value="3">Teleatendimento</SelectItem>
              <SelectItem value="4">Entrega em domicílio</SelectItem>
              <SelectItem value="9">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="pb-1">Modalidade do Frete</Label>
          <Select
            value={form.watch("modalidade_frete")}
            onValueChange={(v) => form.setValue("modalidade_frete", v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Por conta do emitente</SelectItem>
              <SelectItem value="1">Por conta do destinatário</SelectItem>
              <SelectItem value="2">Por conta de terceiros</SelectItem>
              <SelectItem value="9">Sem frete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="pb-1">Origem</Label>
          <Select
            value={form.watch("icms_origem")}
            onValueChange={(v) => form.setValue("icms_origem", v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Nacional</SelectItem>
              <SelectItem value="1">Estrangeira (importação direta)</SelectItem>
              <SelectItem value="2">Estrangeira (mercado interno)</SelectItem>
              <SelectItem value="4">Nacional – PPB</SelectItem>
              <SelectItem value="5">Nacional &lt; 40% importado</SelectItem>
              <SelectItem value="6">Estrangeira s/ similar nacional</SelectItem>
              <SelectItem value="7">Estrangeira MI s/ similar</SelectItem>
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

        <div className="space-y-2">
          <Label htmlFor="icms_cst">ICMS/CSOSN (digitável)</Label>
          <Input
            id="icms_cst"
            placeholder='Ex.: "102", "500", "60", "900"...'
            {...form.register("icms_situacao_tributaria")}
            value={form.watch("icms_situacao_tributaria") ?? ""}
            onChange={(e) =>
              form.setValue(
                "icms_situacao_tributaria",
                e.target.value.replace(/\D/g, "").slice(0, 3),
                { shouldValidate: true },
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Digite exatamente o código informado pela contabilidade. Para ST use
            “60”.
          </p>
        </div>

        {/* ST somente quando ICMS = 60 */}
        {icms === "60" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="vbc_st_ret">
                vBCSTRet (base de cálculo ST retida)
              </Label>
              <Input
                id="vbc_st_ret"
                inputMode="decimal"
                placeholder="Ex.: 100.00"
                {...form.register("vbc_st_ret")}
                value={form.watch("vbc_st_ret") ?? ""}
                onChange={(e) =>
                  form.setValue("vbc_st_ret", e.target.value.replace(",", "."))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pst">pST (% ST)</Label>
              <Input
                id="pst"
                inputMode="decimal"
                placeholder="Ex.: 12"
                {...form.register("pst")}
                value={form.watch("pst") ?? ""}
                onChange={(e) =>
                  form.setValue("pst", e.target.value.replace(",", "."))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vicms_sub">vICMSSubstituto</Label>
              <Input
                id="vicms_sub"
                inputMode="decimal"
                placeholder="Ex.: 5.40"
                {...form.register("vicms_substituto")}
                value={form.watch("vicms_substituto") ?? ""}
                onChange={(e) =>
                  form.setValue(
                    "vicms_substituto",
                    e.target.value.replace(",", "."),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vicms_st_ret">vICMSSTRet (ICMS ST retido)</Label>
              <Input
                id="vicms_st_ret"
                inputMode="decimal"
                placeholder="Ex.: 4.80"
                {...form.register("vicms_st_ret")}
                value={form.watch("vicms_st_ret") ?? ""}
                onChange={(e) =>
                  form.setValue(
                    "vicms_st_ret",
                    e.target.value.replace(",", "."),
                  )
                }
              />
            </div>
          </>
        )}

        <div>
          <Label className="pb-1">IPI</Label>
          <Input {...form.register("ipi")} />
        </div>

        <div>
          <Label className="pb-1">Estado (UF)</Label>
          <Input {...form.register("state")} maxLength={2} />
        </div>

        <div className="col-span-2">
          <span className="text-sm text-muted-foreground">
            Regime tributário da empresa:{" "}
            <b>
              {crt == null
                ? "—"
                : crt === 3
                  ? "Regime Normal (CRT=3)"
                  : crt === 4
                    ? "MEI (CRT=4)"
                    : `Simples Nacional (CRT=${crt})`}
            </b>
          </span>
        </div>
      </div>

      <div className="pt-4 pb-4">
        <Button type="submit" className="mt-2 w-full md:w-auto">
          {editId ? "Atualizar Operação" : "Salvar Operação"}
        </Button>
      </div>

      <hr className="my-4" />

      {/* Lista */}
      <div className="pt-4">
        <h3 className="font-medium mb-2">Operações já cadastradas</h3>
        <ul className="space-y-1">
          {operations.map((row) => (
            <li
              key={row.id}
              className="border p-2 rounded-md flex justify-between items-center"
            >
              <div>
                <strong>
                  {row.operation_id} -{" "}
                  {row.tipo_documento === "0" ? "Entrada" : "Saída"} -{" "}
                  {row.natureza_operacao}
                </strong>{" "}
                - CFOP: {row.cfop},{" "}
                {row.csosn_icms ? (
                  <>ICMS: CSOSN {row.csosn_icms}</>
                ) : (
                  <>ICMS: CST {row.cst_icms ?? "—"}</>
                )}
                , IPI: {row.ipi ?? "—"}, PIS: {row.pis}, COFINS: {row.cofins},
                Estado: {row.state}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(row)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(row.id)}
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
