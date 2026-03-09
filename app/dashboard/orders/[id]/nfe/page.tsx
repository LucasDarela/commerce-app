"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Label } from "@/components/ui/label";
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
  pis?: string | null;
  cofins?: string | null;
  ipi?: string | null;
};

export default function EmitNfePage() {
  const params = useParams();
const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { companyId } = useAuthenticatedCompany();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [emissor, setEmissor] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
  .select(`
    id,
    order_id,
    product_id,
    quantity,
    price,
    products (
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
      icms_situacao_tributaria,
      pis,
      cofins,
      ipi
    )
  `)
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
  const pid = String(i.product_id);
  const soldQty = Number(i.quantity ?? 0);
  const returnedQty = Number(returnedByProduct.get(pid) ?? 0);
  const netQty = Math.max(soldQty - returnedQty, 0);

  return {
    item_id: String(i.id),
    product_id: pid,
    code: String(i.products?.code ?? pid),
    name: String(i.products?.name ?? "Produto"),
    unit: String(i.products?.unit ?? "UN"),
    soldQty,
    returnedQty,
    netQty,
    price: Number(i.price ?? 0),

    ncm: i.products?.ncm ?? null,
    cest: i.products?.cest ?? null,
    cfop: i.products?.cfop ?? null,
    icms_origem: i.products?.icms_origem ?? null,
    cst_icms: i.products?.cst_icms ?? null,
    csosn_icms: i.products?.csosn_icms ?? null,
    icms_situacao_tributaria: i.products?.icms_situacao_tributaria ?? null,
    pis: i.products?.pis ?? null,
    cofins: i.products?.cofins ?? null,
    ipi: i.products?.ipi ?? null,
  };
});

      setProducts(uiProducts);
    };

    fetchAll();
  }, [id, companyId, supabase]);

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

  const handleEmit = async () => {
    if (loading) return;

    if (!operacaoFiscal)
      return toast.error("Selecione um tipo de operação fiscal");
    if (!customer) return toast.error("Cliente não encontrado");
    if (!emissor) return toast.error("Emissor não definido");

    const produtosParaNfe = products.filter((p) => p.netQty > 0);
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
  toast.error(`O produto ${invalidProductNcm.name} está sem NCM cadastrado.`);
  return;
}

// 🔴 valida CFOP
const invalidProductCfop = produtosParaNfe.find((p) => {
  const cfop = String(p.cfop || operacaoFiscal.cfop || "").replace(/\D/g, "");
  return cfop.length !== 4;
});

if (invalidProductCfop) {
  toast.error(`O produto ${invalidProductCfop.name} está com CFOP inválido.`);
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
  toast.error(`O produto ${invalidProductCofins.name} está com COFINS inválido.`);
  return;
}

const regime = String(emissor.regime_tributario ?? "");

if (regime === "1" || regime === "2" || regime === "4") {
  const invalidProductCsosn = produtosParaNfe.find((p) => {
    const csosn = String(p.csosn_icms ?? "").replace(/\D/g, "");
    return csosn.length !== 3;
  });

  if (invalidProductCsosn) {
    toast.error(`O produto ${invalidProductCsosn.name} está sem CSOSN cadastrado.`);
    return;
  }
} else {
const invalidProductCst = produtosParaNfe.find((p) => {
  const cst = String(p.icms_situacao_tributaria ?? p.cst_icms ?? "").replace(/\D/g, "");
  return cst.length < 2 || cst.length > 3;
});

  if (invalidProductCst) {
    toast.error(`O produto ${invalidProductCst.name} está sem CST ICMS cadastrado.`);
    return;
  }
}
const invalidProductOrigem = produtosParaNfe.find((p) => {
  const origem = String(p.icms_origem ?? "").trim();
  return !["0", "1", "2", "3", "4", "5", "6", "7", "8"].includes(origem);
});

if (invalidProductOrigem) {
  toast.error(`O produto ${invalidProductOrigem.name} está com origem do ICMS inválida.`);
  return;
}

    setLoading(true);

    try {
      const hoje = format(new Date(), "yyyy-MM-dd");

      const isSimples = regime === "1" || regime === "2" || regime === "4";

const hasIcms60 = !isSimples && produtosParaNfe.some((p) => {
  const code = String(
    p.icms_situacao_tributaria ?? p.cst_icms ?? "",
  ).trim();
  return code === "60";
});

if (hasIcms60) {
  const faltaST =
    operacaoFiscal.vbc_st_ret == null ||
    operacaoFiscal.pst == null ||
    operacaoFiscal.vicms_substituto == null ||
    operacaoFiscal.vicms_st_ret == null;

  if (faltaST) {
    toast.error(
      "Existe produto com ICMS 60. Preencha na operação fiscal: vbc_st_ret, pst, vicms_substituto e vicms_st_ret.",
    );
    return;
  }
}

const customerDocumentDigits = String(customer.document ?? "").replace(/\D/g, "");

const isCpf = customerDocumentDigits.length === 11;
const isCnpj = customerDocumentDigits.length === 14;

if (!isCpf && !isCnpj) {
  toast.error("Cliente inválido: CPF/CNPJ inválido.");
  return;
} 

const items = produtosParaNfe.map((p, index) => {
  const cfop = String(p.cfop || operacaoFiscal.cfop || "").replace(/\D/g, "");
const ncm = String(p.ncm || "").replace(/\D/g, "");
const cest = String(p.cest || "").replace(/\D/g, "");
const pis = String(p.pis ?? "").replace(/\D/g, "");
const cofins = String(p.cofins ?? "").replace(/\D/g, "");
  const icmsItem = String(
    p.icms_situacao_tributaria ?? p.cst_icms ?? "",
  ).trim();

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
    }),

pis_situacao_tributaria: pis.padStart(2, "0"),
cofins_situacao_tributaria: cofins.padStart(2, "0"),

...(!isSimples && icmsItem === "60"
  ? {
      vbc_st_ret: Number(operacaoFiscal.vbc_st_ret),
      pst: Number(operacaoFiscal.pst),
      vicms_substituto: Number(operacaoFiscal.vicms_substituto),
      vicms_st_ret: Number(operacaoFiscal.vicms_st_ret),
    }
  : {}),
  };
});

      const invoiceData = {
        ambiente: "1",
        note_number: order?.note_number,
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
        items,
      };

      // Debug local (aparece no console do browser)
      // console.log("[NFE PREVIEW] invoiceData", invoiceData);

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

  // dubug 

//   const handleDebugNfe = async () => {
//   if (!operacaoFiscal) {
//     toast.error("Selecione um tipo de operação fiscal");
//     return;
//   }

//   if (!customer) {
//     toast.error("Cliente não encontrado");
//     return;
//   }

//   if (!emissor) {
//     toast.error("Emissor não definido");
//     return;
//   }

//   const produtosParaNfe = products.filter((p) => p.netQty > 0);

//   if (produtosParaNfe.length === 0) {
//     toast.error("Não há itens para debug da NF-e.");
//     return;
//   }

//   try {
//     const hoje = format(new Date(), "yyyy-MM-dd");
//     const regime = String(emissor.regime_tributario ?? "");
//     const isSimples = regime === "1" || regime === "2" || regime === "4";

//     const customerDocumentDigits = String(customer.document ?? "").replace(/\D/g, "");
//     const isCnpj = customerDocumentDigits.length === 14;

//     const items = produtosParaNfe.map((p, index) => {
//       const cfop = String(p.cfop || operacaoFiscal.cfop || "").replace(/\D/g, "");
//       const ncm = String(p.ncm || "").replace(/\D/g, "");
//       const cest = String(p.cest || "").replace(/\D/g, "");
//       const pis = String(p.pis ?? "").replace(/\D/g, "");
//       const cofins = String(p.cofins ?? "").replace(/\D/g, "");
//       const icmsItem = String(
//         p.icms_situacao_tributaria ?? p.cst_icms ?? "",
//       ).trim();
//       const csosnItem = String(p.csosn_icms ?? "").trim();

//       return {
//         numero_item: index + 1,
//         codigo_produto: String(p.code ?? ""),
//         descricao: p.name ?? "",
//         cfop,
// unidade_comercial: String(p.unit ?? "UN").toUpperCase(),
//         quantidade_comercial: Number(p.netQty),
//         valor_unitario_comercial: Number(p.price),
//         valor_unitario_tributavel: Number(p.price),
// unidade_tributavel: String(p.unit ?? "UN").toUpperCase(),
//         codigo_ncm: ncm,
//         codigo_cest: cest || undefined,
//         quantidade_tributavel: Number(p.netQty),
//         valor_bruto: Number(p.price) * Number(p.netQty),
//         icms_origem: String(p.icms_origem ?? "0"),

// ...(isSimples
//   ? {
//       icms_situacao_tributaria: csosnItem || "102",
//     }
//   : {
//       icms_situacao_tributaria: icmsItem || "00",
//     }),

//         pis_situacao_tributaria: pis.padStart(2, "0"),
//         cofins_situacao_tributaria: cofins.padStart(2, "0"),

//         ...(!isSimples && icmsItem === "60"
//           ? {
//               vbc_st_ret: Number(operacaoFiscal.vbc_st_ret),
//               pst: Number(operacaoFiscal.pst),
//               vicms_substituto: Number(operacaoFiscal.vicms_substituto),
//               vicms_st_ret: Number(operacaoFiscal.vicms_st_ret),
//             }
//           : {}),
          
//       };
//     });

//     const invoiceData = {
//       ambiente: "1",
//       note_number: order?.note_number,
//       order_id: id,
//       data_emissao: hoje,
//       data_entrada_saida: hoje,
//       natureza_operacao: operacaoFiscal.natureza_operacao,
//       tipo_documento: Number(operacaoFiscal.tipo_documento),
//       finalidade_emissao: Number(operacaoFiscal.finalidade_emissao),
//       modalidade_frete: 0,
//       valor_frete: Number(freight),
//       valor_seguro: 0,
//       valor_produtos: Number(totalProdutosLiquido),
//       valor_total: Number(totalNota),

//       nome_emitente: emissor.corporate_name,
//       nome_fantasia_emitente: emissor.trade_name,
//       cnpj_emitente: emissor.document?.replace(/\D/g, "") ?? "",
//       inscricao_estadual_emitente: emissor.state_registration,
//       logradouro_emitente: emissor.address,
//       numero_emitente: String(emissor.number ?? "S/N"),
//       bairro_emitente: emissor.neighborhood,
//       municipio_emitente: emissor.city,
//       uf_emitente: emissor.state,
//       cep_emitente: emissor.zip_code?.replace(/\D/g, "") ?? "",

//       ...(isCnpj
//         ? { cnpj_destinatario: customerDocumentDigits }
//         : { cpf_destinatario: customerDocumentDigits }),

//       nome_destinatario: customer.name,
//       telefone_destinatario: String(customer.phone ?? "")
//         .replace(/\D/g, "")
//         .replace(/^55/, ""),

//       inscricao_estadual_destinatario:
//         customer.state_registration?.trim() || "ISENTO",
//       logradouro_destinatario: customer.address,
//       numero_destinatario: String(customer.number ?? "S/N"),
//       bairro_destinatario: customer.neighborhood ?? "",
//       municipio_destinatario: customer.city,
//       uf_destinatario: customer.state,
//       cep_destinatario: customer.zip_code?.replace(/\D/g, "") ?? "",
//       pais_destinatario: "Brasil",
//       presenca_comprador: operacaoFiscal.presenca_comprador || "1",
//       items,
//     };

//     const response = await fetch("/api/nfe/debug", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ companyId, invoiceData }),
//     });

//     const data = await response.json();

//     console.log("[DEBUG NF-E RESPONSE]", data);

//     if (!response.ok) {
//       toast.error(data?.error || "Erro ao gerar debug da NF-e.");
//       return;
//     }

//     toast.success("Debug da NF-e gerado. Veja o console.");
//   } catch (error) {
//     console.error("[DEBUG NF-E ERROR]", error);
//     toast.error("Erro ao executar debug da NF-e.");
//   }
// };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Emissão de NF-e</h1>
      <p>Revise os dados antes de emitir a nota</p>

      <Label>Tipo de Operação Fiscal</Label>
      <Select value={selectedOperation} onValueChange={setSelectedOperation}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma operação fiscal" />
        </SelectTrigger>
        <SelectContent>
          {operations.map((op) => (
            <SelectItem key={op.id} value={String(op.id)}>
              {op.operation_id} - {op.natureza_operacao} -{" "}
              {op.tipo_documento === "0" ? "Entrada" : "Saída"} - Estado{" "}
              {op.state} - CFOP - {op.cfop}
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
        onClick={handleEmit}
        disabled={loading || !selectedOperation}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Emitindo NF-e..." : "Emitir NF-e"}
      </Button>

      {/* <Button variant="outline" onClick={handleDebugNfe}>
        Debug NF-e
      </Button> */}
    </div>  
  );
}
