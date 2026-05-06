"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { emitInvoice } from "@/lib/focus-nfe/emitInvoice";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { format } from "date-fns";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  setBreadcrumbOverride,
  removeBreadcrumbOverride,
} from "@/hooks/useBreadcrumb";

type UiProduct = {
  item_id: string;
  product_id: string;
  code: string;
  name: string;
  unit: string;
  soldQty: number;
  returnedQty: number;
  netQty: number;
  price: number;

  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  icms_origem?: string | null;
  cst_icms?: string | null;
  csosn_icms?: string | null;
  icms_situacao_tributaria?: string | null;
  pis: string | null;
  cofins: string | null;
  ipi: string | null;
  vbc_st_ret: string | null;
  pst: string | null;
  vicms_substituto: string | null;
  vicms_st_ret: string | null;
};

export default function EmitNfePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { companyId } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [emissor, setEmissor] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [nextNumber, setNextNumber] = useState<string>("");
  const [nextSerie, setNextSerie] = useState<string>("");
  const [lastNfeStatus, setLastNfeStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !id) return;

    const fetchAll = async () => {
      // 1) Pedido + cliente
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("*, customers(*)")
        .eq("id", id)
        .single();

      if (orderErr) {
        console.error(orderErr);
        toast.error("Erro ao carregar o pedido");
        return;
      }

      // 2) Itens do pedido
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select(
          `
    id,
    order_id,
    product_id,
    quantity,
    price,
    products:products!order_items_product_id_fkey (
      id,
      name,
      code,
      unit,
      ncm,
      cest,
      cfop,
      icms_origem,
      cst_icms,
      csosn_icms,
      pis,
      cofins,
      ipi,
      vbc_st_ret,
      pst,
      vicms_substituto,
      vicms_st_ret
    )
  `,
        )
        .eq("order_id", id);

      if (itemsErr) {
        console.error(itemsErr);
        toast.error("Erro ao carregar itens do pedido");
        return;
      }

      // 3) Devoluções (stock_movements)
      const { data: returns, error: returnsErr } = await supabase
        .from("stock_movements")
        .select("product_id, quantity, type, note_id")
        .eq("company_id", companyId)
        .eq("note_id", id)
        .eq("type", "return");

      if (returnsErr) {
        console.error(returnsErr);
        toast.error("Erro ao carregar devoluções");
        return;
      }

      // 4) Operações fiscais
      const { data: ops, error: opsErr } = await supabase
        .from("fiscal_operations")
        .select("*")
        .eq("company_id", companyId);

      if (opsErr) {
        console.error(opsErr);
        toast.error("Erro ao carregar operações fiscais");
        return;
      }

      // 5) Empresa (emitente)
      const { data: companyData, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (compErr) {
        console.error(compErr);
        toast.error("Erro ao carregar dados do emitente");
        return;
      }

      // ---- montar state ----
      setOrder(orderData);
      setCustomer(orderData.customers);
      setEmissor(companyData);

      const orderedOps = (ops ?? []).sort(
        (a, b) => a.operation_id - b.operation_id,
      );
      setOperations(orderedOps);

      // Map devoluções por produto
      const returnedByProduct = new Map<string, number>();
      for (const r of returns ?? []) {
        const pid = String(r.product_id);
        const qty = Number(r.quantity ?? 0);
        returnedByProduct.set(pid, (returnedByProduct.get(pid) ?? 0) + qty);
      }

      const uiProducts: UiProduct[] = (items ?? []).map((i: any) => {
        const pid = i.product_id ? String(i.product_id) : "";
        const soldQty = Number(i.quantity ?? 0);
        const returnedQty = Number(returnedByProduct.get(pid) ?? 0);
        const netQty = Math.max(soldQty - returnedQty, 0);

        const product = Array.isArray(i.products)
          ? (i.products[0] ?? null)
          : (i.products ?? null);

        return {
          item_id: String(i.id),
          product_id: pid,
          code: String(product?.code ?? ""),
          name: String(product?.name ?? "Produto sem vínculo"),
          unit: String(product?.unit ?? "UN"),
          soldQty,
          returnedQty,
          netQty,
          price: Number(i.price ?? 0),

          ncm: product?.ncm ?? null,
          cest: product?.cest ?? null,
          cfop: product?.cfop ?? null,
          icms_origem: product?.icms_origem ?? null,
          cst_icms: product?.cst_icms ?? null,
          csosn_icms: product?.csosn_icms ?? null,
          icms_situacao_tributaria: product?.icms_situacao_tributaria ?? null,
          pis: product?.pis ?? null,
          cofins: product?.cofins ?? null,
          ipi: product?.ipi ?? null,
          vbc_st_ret: product?.vbc_st_ret ?? null,
          pst: product?.pst ?? null,
          vicms_substituto: product?.vicms_substituto ?? null,
          vicms_st_ret: product?.vicms_st_ret ?? null,
        };
      });
      setProducts(uiProducts);

      // 6) Verificar se já existe nota (e se foi cancelada)
      const { data: nfeData } = await supabase
        .from("nfe")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nfeData) {
        setLastNfeStatus(nfeData.status);
        if (nfeData.numero) {
          setNextNumber(String(Number(nfeData.numero) + 1));
          setNextSerie(String(nfeData.serie || ""));
        }
      }
    };

    fetchAll();
  }, [id, companyId, supabase]);

  useEffect(() => {
    if (id && order?.note_number) {
      setBreadcrumbOverride(id, `${order.note_number}`);
    }
    return () => {
      if (id) {
        removeBreadcrumbOverride(id);
      }
    };
  }, [id, order?.note_number]);

  const operacaoFiscal = useMemo(
    () => operations.find((o) => String(o.id) === selectedOperation),
    [operations, selectedOperation],
  );

  const freight = useMemo(() => Number(order?.freight ?? 0), [order]);

  const totalProdutosLiquido = useMemo(() => {
    return products.reduce((acc, p) => acc + p.netQty * Number(p.price), 0);
  }, [products]);

  const totalNota = useMemo(() => {
    return Number(totalProdutosLiquido) + Number(freight);
  }, [totalProdutosLiquido, freight]);

  const handleEmit = async (manualNumber?: string, manualSerie?: string) => {
    if (loading) return;

    // Se já teve nota cancelada e NÃO estamos passando um número manual ainda, abre o modal
    if (lastNfeStatus === "cancelado" && !manualNumber && !showNumberModal) {
      setShowNumberModal(true);
      return;
    }

    if (!operacaoFiscal)
      return toast.error("Selecione um tipo de operação fiscal");
    if (!customer) return toast.error("Cliente não encontrado");
    if (!emissor) return toast.error("Emissor não definido");

    const produtosParaNfe = products.filter((p) => p.netQty > 0);
    const invalidLinkedProduct = produtosParaNfe.find(
      (p) => !p.product_id || p.product_id === "null",
    );

    if (invalidLinkedProduct) {
      toast.error(
        "Existe item da venda sem vínculo com produto cadastrado. Edite ou recrie a venda.",
      );
      return;
    }
    console.log("produtosParaNfe:", produtosParaNfe);
    if (produtosParaNfe.length === 0) {
      return toast.error(
        "Todos os itens estão devolvidos. Não há itens para emitir na NF-e.",
      );
    }

    // 🔴 valida NCM
    const invalidProductNcm = produtosParaNfe.find((p) => {
      const ncm = String(p.ncm ?? "").replace(/\D/g, "");
      return ncm.length !== 8;
    });

    if (invalidProductNcm) {
      toast.error(
        `O produto ${invalidProductNcm.name} está com NCM ausente ou inválido.`,
      );
      return;
    }

    // 🔴 valida CFOP
    const invalidProductCfop = produtosParaNfe.find((p) => {
      const cfop = String(p.cfop || "").replace(
        /\D/g,
        "",
      );
      return cfop.length !== 4;
    });

    if (invalidProductCfop) {
      toast.error(
        `O produto ${invalidProductCfop.name} está com CFOP inválido.`,
      );
      return;
    }

    // 🔴 valida PIS
    const invalidProductPis = produtosParaNfe.find((p) => {
      const pis = String(p.pis ?? "").replace(/\D/g, "");
      return pis.length !== 2;
    });

    if (invalidProductPis) {
      toast.error(`O produto ${invalidProductPis.name} está com PIS inválido.`);
      return;
    }

    // 🔴 valida COFINS
    const invalidProductCofins = produtosParaNfe.find((p) => {
      const cofins = String(p.cofins ?? "").replace(/\D/g, "");
      return cofins.length !== 2;
    });

    if (invalidProductCofins) {
      toast.error(
        `O produto ${invalidProductCofins.name} está com COFINS inválido.`,
      );
      return;
    }

    const regime = String(emissor.regime_tributario ?? "");

    if (regime === "1" || regime === "2" || regime === "4") {
      const invalidProductCsosn = produtosParaNfe.find((p) => {
        const csosn = String(p.csosn_icms ?? "").replace(/\D/g, "");
        return csosn.length !== 3;
      });

      if (invalidProductCsosn) {
        toast.error(
          `O produto ${invalidProductCsosn.name} está sem CSOSN cadastrado.`,
        );
        return;
      }
    } else {
      const invalidProductCst = produtosParaNfe.find((p) => {
        const cst = String(
          p.icms_situacao_tributaria ?? p.cst_icms ?? "",
        ).replace(/\D/g, "");
        return cst.length < 2 || cst.length > 3;
      });

      if (invalidProductCst) {
        toast.error(
          `O produto ${invalidProductCst.name} está sem CST ICMS cadastrado.`,
        );
        return;
      }
    }
    const invalidProductOrigem = produtosParaNfe.find((p) => {
      const origem = String(p.icms_origem ?? "").trim();
      return !["0", "1", "2", "3", "4", "5", "6", "7", "8"].includes(origem);
    });

    if (invalidProductOrigem) {
      toast.error(
        `O produto ${invalidProductOrigem.name} está com origem do ICMS inválida.`,
      );
      return;
    }

    setLoading(true);

    try {
      const hoje = format(new Date(), "yyyy-MM-dd");

      const isSimples = regime === "1" || regime === "2" || regime === "4";

      const hasST = produtosParaNfe.some((p) => {
        const icms = String(p.icms_situacao_tributaria ?? p.cst_icms ?? "").trim();
        const csosn = String(p.csosn_icms ?? "").trim();
        return icms === "60" || csosn === "500";
      });

      if (hasST) {
        // Validação: pelo menos um deles (produto ou operação) deve ter valores se o CST for 60/500
        // Nota: O fallback automático para 0 já acontece no emitInvoice, então aqui apenas avisamos se tudo estiver zerado e for crítico.
      }

      const customerDocumentDigits = String(customer.document ?? "").replace(
        /\D/g,
        "",
      );

      const isCpf = customerDocumentDigits.length === 11;
      const isCnpj = customerDocumentDigits.length === 14;

      if (!isCpf && !isCnpj) {
        toast.error("Cliente inválido: CPF/CNPJ inválido.");
        return;
      }

      const items = produtosParaNfe.map((p, index) => {
        const cfop = String(p.cfop || "").replace(
          /\D/g,
          "",
        );
        const ncm = String(p.ncm || "").replace(/\D/g, "");
        const cest = String(p.cest || "").replace(/\D/g, "");
        const pis = String(p.pis ?? "").replace(/\D/g, "");
        const cofins = String(p.cofins ?? "").replace(/\D/g, "");
        const icmsItem = String(p.cst_icms ?? p.csosn_icms ?? "").trim();

        const csosnItem = String(p.csosn_icms ?? "").trim();

        return {
          numero_item: index + 1,
          codigo_produto: String(p.code ?? ""),
          descricao: p.name ?? "",
          cfop: cfop,
          unidade_comercial: String(p.unit ?? "UN").toUpperCase(),
          quantidade_comercial: Number(p.netQty),
          valor_unitario_comercial: Number(p.price),
          valor_unitario_tributavel: Number(p.price),
          unidade_tributavel: String(p.unit ?? "UN").toUpperCase(),
          codigo_ncm: ncm,
          codigo_cest: cest || undefined,
          quantidade_tributavel: Number(p.netQty),
          valor_bruto: Number(p.price) * Number(p.netQty),
          icms_origem: String(p.icms_origem ?? "0"),

          ...(isSimples
            ? {
                icms_situacao_tributaria: csosnItem || "102",
              }
            : {
                icms_situacao_tributaria: icmsItem || "00",
                valor_bc_icms: Number(p.price) * Number(p.netQty),
                aliquota_icms: Number(operacaoFiscal.aliquota_icms || 17),
                valor_icms: ((Number(p.price) * Number(p.netQty) * Number(operacaoFiscal.aliquota_icms || 17)) / 100),
              }),

          pis_situacao_tributaria: pis.padStart(2, "0"),
          aliquota_pis: Number(operacaoFiscal.aliquota_pis || 1.65),
          valor_bc_pis: Number(p.price) * Number(p.netQty),
          valor_pis: ((Number(p.price) * Number(p.netQty) * Number(operacaoFiscal.aliquota_pis || 1.65)) / 100).toFixed(2),
          cofins_situacao_tributaria: cofins.padStart(2, "0"),
          aliquota_cofins: Number(operacaoFiscal.aliquota_cofins || 7.6),
          valor_bc_cofins: Number(p.price) * Number(p.netQty),
          valor_cofins: ((Number(p.price) * Number(p.netQty) * Number(operacaoFiscal.aliquota_cofins || 7.6)) / 100).toFixed(2),

          // Reforma Tributária 2026 (IBS / CBS)
          ibs_situacao_tributaria: "01",
          aliquota_ibs: Number(operacaoFiscal.aliquota_ibs || 17.7),
          valor_bc_ibs: Number(p.price) * Number(p.netQty),
          valor_ibs: ((Number(p.price) * Number(p.netQty) * Number(operacaoFiscal.aliquota_ibs || 17.7)) / 100).toFixed(2),

          cbs_situacao_tributaria: "01",
          aliquota_cbs: Number(operacaoFiscal.aliquota_cbs || 8.8),
          valor_bc_cbs: Number(p.price) * Number(p.netQty),
          valor_cbs: ((Number(p.price) * Number(p.netQty) * Number(operacaoFiscal.aliquota_cbs || 8.8)) / 100).toFixed(2),

          ...(icmsItem === "60" || csosnItem === "500"
            ? {
                vbc_st_ret: Number(p.vbc_st_ret ?? operacaoFiscal.vbc_st_ret ?? 0),
                pst: Number(p.pst ?? operacaoFiscal.pst ?? 0),
                vicms_substituto: Number(p.vicms_substituto ?? operacaoFiscal.vicms_substituto ?? 0),
                vicms_st_ret: Number(p.vicms_st_ret ?? operacaoFiscal.vicms_st_ret ?? 0),
              }
            : {}),
        };
      });

      const invoiceData = {
        ambiente: emissor.environment || "homologacao",
        numero: manualNumber || undefined,
        serie: manualSerie || undefined,
        order_id: id,

        data_emissao: hoje,
        data_entrada_saida: hoje,
        natureza_operacao: operacaoFiscal.natureza_operacao,
        tipo_documento: Number(operacaoFiscal.tipo_documento),
        finalidade_emissao: Number(operacaoFiscal.finalidade_emissao),

        modalidade_frete: 0,
        valor_frete: Number(freight),
        valor_seguro: 0,

        // ✅ agora é líquido
        valor_produtos: Number(totalProdutosLiquido),
        // ✅ agora soma frete
        valor_total: Number(totalNota),

        nome_emitente: emissor.corporate_name,
        nome_fantasia_emitente: emissor.trade_name,
        cnpj_emitente: emissor.document?.replace(/\D/g, "") ?? "",
        inscricao_estadual_emitente: emissor.state_registration,
        logradouro_emitente: emissor.address,
        numero_emitente: String(emissor.number ?? "S/N"),
        bairro_emitente: emissor.neighborhood,
        municipio_emitente: emissor.city,
        uf_emitente: emissor.state,
        cep_emitente: emissor.zip_code?.replace(/\D/g, "") ?? "",

        ...(isCnpj
          ? { cnpj_destinatario: customerDocumentDigits }
          : { cpf_destinatario: customerDocumentDigits }),

        nome_destinatario: customer.name,
        telefone_destinatario: String(customer.phone ?? "")
          .replace(/\D/g, "")
          .replace(/^55/, ""),

        inscricao_estadual_destinatario:
          customer.state_registration?.trim() || "ISENTO",
        logradouro_destinatario: customer.address,
        numero_destinatario: String(customer.number ?? "S/N"),
        bairro_destinatario: customer.neighborhood ?? "",
        municipio_destinatario: customer.city,
        uf_destinatario: customer.state,
        cep_destinatario: customer.zip_code?.replace(/\D/g, "") ?? "",
        pais_destinatario: "Brasil",

        presenca_comprador: operacaoFiscal.presenca_comprador || "1",
        id_dest: Number(operacaoFiscal.local_destino || 1),
        consumidor_final: Number(operacaoFiscal.consumidor_final || 1),
        indicador_inscricao_estadual_destinatario: 
          customer.state_registration?.trim() && customer.state_registration !== "ISENTO" ? 1 : 9,
        items,
      };

      const r = await fetch("/api/nfe/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, invoiceData }),
      });

      const raw = await r.text();
      let body: any = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {}

      if (!r.ok || body?.success !== true) {
        const msg =
          body?.detalhes_texto ||
          body?.error ||
          body?.mensagem_sefaz ||
          body?.focus?.mensagem ||
          body?.focus?.erros?.[0]?.mensagem ||
          `Falha ao emitir NF-e (HTTP ${r.status})`;

        console.error("Erro Focus (response):", { status: r.status, body });
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success(
        <div>
          NF-e enviada para autorização!{" "}
          <Link href="/dashboard/nfe" className="underline font-medium">
            Acesse aqui
          </Link>{" "}
          para verificar o status.
        </div>,
        { duration: 6000 },
      );
    } catch (err: any) {
      console.error("Erro de rede/JS ao emitir NF-e:", err);
      toast.error("Erro de rede ao emitir NF-e. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Emissão de NF-e</h1>
      <p>Revise os dados antes de emitir a nota</p>

      <Label>Tipo de Operação Fiscal</Label>
      <Select value={selectedOperation} onValueChange={setSelectedOperation}>
        <SelectTrigger className="w-full overflow-hidden">
          <SelectValue placeholder="Selecione uma operação fiscal" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          {operations.map((op) => (
            <SelectItem key={op.id} value={String(op.id)}>
              <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-xs sm:text-sm overflow-hidden">
                <span className="font-medium whitespace-nowrap">
                  {op.operation_id} - {op.natureza_operacao}
                </span>
                <span className="hidden sm:inline text-muted-foreground">
                  /
                </span>
                <span className="truncate text-muted-foreground">
                  {op.tipo_documento === "0" ? "Entrada" : "Saída"} - {op.state}{" "}
                  - CFOP {op.cfop}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="border p-4 rounded-md space-y-2">
        <h2 className="font-medium">Produtos</h2>
        <ul className="text-sm space-y-1">
          {products.map((p) => (
            <li key={p.item_id} className="flex justify-between gap-3">
              <span className="truncate">
                {p.name} ({p.unit})
              </span>
              <span className="whitespace-nowrap">
                Vend.: {p.soldQty} | Dev.: {p.returnedQty} | NF-e: {p.netQty} |
                R$ {p.price.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="pt-2 border-t text-sm space-y-1">
          <div className="flex justify-between">
            <span>Total produtos (líquido)</span>
            <span>R$ {totalProdutosLiquido.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span>R$ {freight.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total NF-e</span>
            <span>R$ {totalNota.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Button
        className="mt-4 flex items-center gap-2"
        onClick={() => handleEmit()}
        disabled={loading || !selectedOperation}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Emitindo NF-e..." : "Emitir NF-e"}
      </Button>

      <Dialog open={showNumberModal} onOpenChange={setShowNumberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota Anterior Cancelada</DialogTitle>
            <DialogDescription>
              Detectamos que este pedido já possui uma nota cancelada. 
              Para emitir uma nova, você deve informar o próximo número da sequência.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="number" className="text-right">Número</Label>
              <Input
                id="number"
                value={nextNumber}
                onChange={(e) => setNextNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serie" className="text-right">Série</Label>
              <Input
                id="serie"
                value={nextSerie}
                onChange={(e) => setNextSerie(e.target.value)}
                className="col-span-3"
                placeholder="Ex: 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNumberModal(false)}>Cancelar</Button>
            <Button onClick={() => {
              setShowNumberModal(false);
              handleEmit(nextNumber, nextSerie);
            }}>
              Emitir com Novo Número
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
