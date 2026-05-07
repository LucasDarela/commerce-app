"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Pencil, Trash, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

/** ---------- Schema ---------- */
const formSchema = z
  .object({
    description: z.string().optional(),
    operation_id: z.coerce.number().min(1, "Obrigatório"),
    group: z.string().optional(),
    specification: z.string().optional(),

    icms_situacao_tributaria: z.string().min(1, "Informe o ICMS/CSOSN"),

    cst_icms: z.string().optional(),
    csosn_icms: z.string().optional(),

    natureza_operacao: z.string().min(1, "Obrigatório"),
    tipo_documento: z.enum(["0", "1"]),
    local_destino: z.enum(["1", "2", "3"]),
    finalidade_emissao: z.enum(["1", "2", "3", "4"]),
    consumidor_final: z.enum(["0", "1"]),
    presenca_comprador: z.enum(["0", "1", "2", "3", "4", "9"]),
    modalidade_frete: z.enum(["0", "1", "2", "9"]),

    vbc_st_ret: z.string().optional(),
    pst: z.string().optional(),
    vicms_substituto: z.string().optional(),
    vicms_st_ret: z.string().optional(),
    aliquota_ibs: z.string().optional(),
    aliquota_cbs: z.string().optional(),
    aliquota_pis: z.string().optional(),
    aliquota_cofins: z.string().optional(),
    aliquota_icms: z.string().optional(),
    state: z.string().optional(),
    ibs_cbs_situacao_tributaria: z.string().optional(),
    ibs_cbs_classificacao_tributaria: z.string().optional(),
    icms_origem: z.string().optional(),
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

type FiscalOperationRow = {
  id: string;
  company_id: string;
  operation_id: number;
  natureza_operacao: string;
  tipo_documento: "0" | "1";
  icms_situacao_tributaria?: string | null;
  state?: string | null;
  description?: string | null;
  group?: string | null;
  specification?: string | null;
  local_destino?: "1" | "2" | "3";
  finalidade_emissao?: "1" | "2" | "3" | "4";
  consumidor_final?: "0" | "1";
  presenca_comprador?: "0" | "1" | "2" | "3" | "4" | "9";
  modalidade_frete?: "0" | "1" | "2" | "9";
  vbc_st_ret?: string | null;
  pst?: string | null;
  vicms_substituto?: string | null;
  vicms_st_ret?: string | null;
  aliquota_ibs?: string | null;
  aliquota_cbs?: string | null;
  aliquota_pis?: string | null;
  aliquota_cofins?: string | null;
  ibs_cbs_situacao_tributaria?: string | null;
  ibs_cbs_classificacao_tributaria?: string | null;
  cst_icms?: string | null;
  csosn_icms?: string | null;
  icms_origem?: string | null;
  aliquota_icms?: number | null;
  cfop?: string | null;
  ncm?: string | null;
  ipi?: string | null;
  pis?: string | null;
  cofins?: string | null;
};

/** ---------- Utils ---------- */
const pad2 = (v?: string | number | null) =>
  v == null || v === "" ? undefined : v.toString().padStart(2, "0");

const defaultValuesForm = {
  finalidade_emissao: "1" as const,
  tipo_documento: "1" as const,
  local_destino: "1" as const,
  consumidor_final: "1" as const,
  presenca_comprador: "1" as const,
  modalidade_frete: "0" as const,
  icms_situacao_tributaria: "",
  description: "",
  operation_id: 1,
  group: "",
  specification: "",
  cst_icms: "",
  csosn_icms: "",
  state: "",
  natureza_operacao: "",
  vbc_st_ret: "",
  pst: "",
  vicms_substituto: "",
  vicms_st_ret: "",
  aliquota_ibs: "",
  aliquota_cbs: "",
  aliquota_pis: "",
  aliquota_cofins: "",
  aliquota_icms: "17.0",
  ibs_cbs_situacao_tributaria: "000",
  ibs_cbs_classificacao_tributaria: "000001",
};

/** ---------- Componente ---------- */
export default function FiscalOperationForm() {
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [crt, setCrt] = useState<number | null>(null);
  const [operations, setOperations] = useState<FiscalOperationRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const isSN = useMemo(() => crt === 1 || crt === 2 || crt === 4, [crt]);

  const form = useForm<FiscalOperationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValuesForm,
  });

  const fetchOperations = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("fiscal_operations")
      .select("*")
      .eq("company_id", companyId)
      .order("operation_id", { ascending: true });

    if (error) {
      console.error("Erro ao carregar operações fiscais:", error);
      toast.error("Erro ao carregar operações fiscais");
      return;
    }
    setOperations((data as FiscalOperationRow[]) || []);
  }, [companyId, supabase]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!companyId || companyLoading) return;
      setLoadingInitial(true);
      try {
        const [companyRes, operationsRes] = await Promise.all([
          supabase
            .from("companies")
            .select("regime_tributario")
            .eq("id", companyId)
            .maybeSingle(),
          supabase
            .from("fiscal_operations")
            .select("*")
            .eq("company_id", companyId)
            .order("operation_id", { ascending: true }),
        ]);

        if (companyRes.error) {
          console.error("Erro ao buscar regime tributário:", companyRes.error);
        } else {
          setCrt(companyRes.data?.regime_tributario ?? null);
        }

        if (operationsRes.error) {
          console.error(
            "Erro ao carregar operações fiscais:",
            operationsRes.error,
          );
          toast.error("Erro ao carregar operações fiscais");
        } else {
          setOperations((operationsRes.data as FiscalOperationRow[]) || []);
        }
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
  }, [companyId, companyLoading, supabase]);

  const onCancelEdit = () => {
    setEditId(null);
    form.reset(defaultValuesForm);
  };

  const onSubmit = async (data: FiscalOperationFormData) => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      const full = {
        ...data,
        company_id: companyId,
        cst_icms: isSN ? null : pad2(data.icms_situacao_tributaria),
        csosn_icms: isSN ? pad2(data.icms_situacao_tributaria) : null,
        state: data.state?.toUpperCase() || undefined,
      };

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
        "state",
        "vbc_st_ret",
        "pst",
        "vicms_substituto",
        "vicms_st_ret",
        "cst_icms",
        "csosn_icms",
        "aliquota_ibs",
        "aliquota_cbs",
        "aliquota_pis",
        "aliquota_cofins",
        "aliquota_icms",
        "ibs_cbs_situacao_tributaria",
        "ibs_cbs_classificacao_tributaria",
      ];

      const payload = Object.fromEntries(
        Object.entries(full).filter(([k]) => allow.includes(k as any)),
      );

      if (full.icms_situacao_tributaria?.trim() !== "60") {
        delete (payload as any).vbc_st_ret;
        delete (payload as any).pst;
        delete (payload as any).vicms_substituto;
        delete (payload as any).vicms_st_ret;
      }

      const { data: existing, error: fetchError } = await supabase
        .from("fiscal_operations")
        .select("id, operation_id")
        .eq("company_id", companyId)
        .eq("operation_id", data.operation_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Erro ao verificar duplicidade:", fetchError);
        toast.error("Erro ao verificar duplicidade");
        return;
      }

      if (editId) {
        if (existing && existing.id !== editId) {
          toast.error("Já existe uma operação com esse Identificador");
          return;
        }

        const { error } = await supabase
          .from("fiscal_operations")
          .update(payload)
          .eq("id", editId)
          .eq("company_id", companyId);

        if (error) {
          toast.error(`Erro ao atualizar operação fiscal: ${error.message}`);
          return;
        }
        toast.success("Operação atualizada com sucesso");
      } else {
        if (existing) {
          toast.error("Já existe uma operação com esse Identificador");
          return;
        }

        const { error } = await supabase
          .from("fiscal_operations")
          .insert(payload);

        if (error) {
          toast.error(`Erro ao salvar operação fiscal: ${error.message}`);
          return;
        }
        toast.success("Operação fiscal salva");
      }

      setEditId(null);
      form.reset(defaultValuesForm);
      await fetchOperations();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: FiscalOperationRow) => {
    setEditId(row.id);
    form.reset({
      description: row.description ?? "",
      operation_id: row.operation_id ?? 1,
      group: row.group ?? "",
      specification: row.specification ?? "",
      icms_situacao_tributaria: String(row.cst_icms || row.csosn_icms || ""),
      cst_icms: row.cst_icms ?? "",
      csosn_icms: row.csosn_icms ?? "",
      state: row.state ?? "",
      natureza_operacao: row.natureza_operacao ?? "",
      tipo_documento: row.tipo_documento ?? "1",
      local_destino: row.local_destino ?? "1",
      finalidade_emissao: row.finalidade_emissao ?? "1",
      consumidor_final: row.consumidor_final ?? "1",
      presenca_comprador: row.presenca_comprador ?? "1",
      modalidade_frete: row.modalidade_frete ?? "0",
      icms_origem: row.icms_origem ?? "0",
      vbc_st_ret: row.vbc_st_ret ? String(row.vbc_st_ret) : "",
      pst: row.pst ? String(row.pst) : "",
      vicms_substituto: row.vicms_substituto
        ? String(row.vicms_substituto)
        : "",
      vicms_st_ret: row.vicms_st_ret ? String(row.vicms_st_ret) : "",
      aliquota_ibs: row.aliquota_ibs ? String(row.aliquota_ibs) : "",
      aliquota_cbs: row.aliquota_cbs ? String(row.aliquota_cbs) : "",
      aliquota_pis: row.aliquota_pis ? String(row.aliquota_pis) : "",
      aliquota_cofins: row.aliquota_cofins
        ? String(row.aliquota_cofins)
        : "",
      aliquota_icms: row.aliquota_icms ? String(row.aliquota_icms) : "17.0",
      ibs_cbs_situacao_tributaria: row.ibs_cbs_situacao_tributaria || "000",
      ibs_cbs_classificacao_tributaria: row.ibs_cbs_classificacao_tributaria || "000001",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    const { error } = await supabase
      .from("fiscal_operations")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao excluir operação");
      return;
    }
    toast.success("Operação excluída");
    await fetchOperations();
  };

  const icms = form.watch("icms_situacao_tributaria")?.trim();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editId ? "Editar Operação Fiscal" : "Nova Operação Fiscal"}
          </CardTitle>
          <CardDescription>
            {crt == null
              ? "Buscando regime tributário..."
              : crt === 3
                ? "Regime Normal (CRT=3)"
                : crt === 4
                  ? "MEI (CRT=4)"
                  : `Simples Nacional (CRT=${crt})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="operation_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Operação</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: 01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="natureza_operacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Natureza da Operação</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Venda de Produto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo_documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Entrada</SelectItem>
                          <SelectItem value="1">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="local_destino"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">No Estado</SelectItem>
                          <SelectItem value="2">Fora do Estado</SelectItem>
                          <SelectItem value="3">Exterior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="finalidade_emissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finalidade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Normal</SelectItem>
                          <SelectItem value="2">Complementar</SelectItem>
                          <SelectItem value="3">Ajuste</SelectItem>
                          <SelectItem value="4">Devolução</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modalidade_frete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Emitente (CIF)</SelectItem>
                          <SelectItem value="1">Destinatário (FOB)</SelectItem>
                          <SelectItem value="2">Terceiros</SelectItem>
                          <SelectItem value="9">Sem Frete</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-full border-t pt-4 mt-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Configurações de Impostos e Alíquotas
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="icms_situacao_tributaria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CST/CSOSN Geral</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: 00 ou 102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aliquota_pis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alíquota PIS (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aliquota_cofins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alíquota COFINS (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF (Opcional)</FormLabel>
                      <FormControl>
                        <Input maxLength={2} placeholder="ex: SC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ibs_cbs_situacao_tributaria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CST Reforma (v2026)</FormLabel>
                      <FormControl>
                        <Input placeholder="101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ibs_cbs_classificacao_tributaria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classificação Tributária (v2026)</FormLabel>
                      <FormControl>
                        <Input placeholder="010101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="aliquota_ibs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alíquota IBS (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aliquota_cbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alíquota CBS (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aliquota_icms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alíquota ICMS (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="17" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("icms_situacao_tributaria") === "60" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-muted/30 rounded-lg border">
                  <FormField
                    control={form.control}
                    name="vbc_st_ret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Retida</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pst"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% ST</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vicms_substituto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>vICMSSubstituto</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vicms_st_ret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>vICMSSTRet</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving || !companyId}>
                  {saving
                    ? "Salvando..."
                    : editId
                      ? "Atualizar Operação"
                      : "Salvar Operação"}
                </Button>
                {editId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelEdit}
                  >
                    Cancelar Edição
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Operações Salvas</CardTitle>
          <CardDescription>
            Gerencie suas naturezas de operações já cadastradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInitial ? (
            <div className="text-sm text-muted-foreground py-4">
              Carregando dados...
            </div>
          ) : operations.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-md bg-muted/20">
              Nenhuma operação cadastrada. Utilize o formulário acima para criar
              a primeira.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {operations.map((row) => (
                <div
                  key={row.id}
                  className="border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 rounded-lg bg-card shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="font-semibold flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        ID {row.operation_id}
                      </span>
                      <span>
                        {row.tipo_documento === "0" ? "Entrada" : "Saída"} -{" "}
                        {row.natureza_operacao}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <strong>CFOP:</strong> {row.cfop}
                      </span>
                      <span>
                        <strong>NCM:</strong> {row.ncm || "—"}
                      </span>
                      {row.csosn_icms ? (
                        <span>
                          <strong>ICMS:</strong> CSOSN {row.csosn_icms}
                        </span>
                      ) : (
                        <span>
                          <strong>ICMS:</strong> CST {row.cst_icms ?? "—"}
                        </span>
                      )}
                      <span>
                        <strong>IPI:</strong> {row.ipi ?? "—"}
                      </span>
                      <span>
                        <strong>PIS/COF:</strong> {row.pis ?? "—"} /{" "}
                        {row.cofins ?? "—"}
                      </span>
                      {row.state && (
                        <span>
                          <strong>UF:</strong> {row.state}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-auto shrink-0 bg-muted/50 p-1 object-contain rounded border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(row)}
                      className="h-8"
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(row.id)}
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
