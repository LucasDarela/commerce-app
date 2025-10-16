"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EmitNfePage() {
  const { id } = useParams();
  const router = useRouter();
  const { companyId } = useAuthenticatedCompany();
  const supabase = createClientComponentClient();

  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [emissor, setEmissor] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const mapPaymentMethod = (method: string): string => {
    switch (method) {
      case "Dinheiro":
        return "01";
      case "Cartao":
        return "03";
      case "Pix":
        return "17";
      case "Boleto":
        return "15";
      default:
        return "99"; // Outros
    }
  };

  useEffect(() => {
    if (!companyId || !id) return;

    const fetchAll = async () => {
      // Busca pedido e cliente
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, customers(*)")
        .eq("id", id)
        .single();

      const { data: items } = await supabase
        .from("order_items")
        .select("*, products(*)")
        .eq("order_id", id);

      const { data: ops } = await supabase
        .from("fiscal_operations")
        .select("*")
        .eq("company_id", companyId);

      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (orderData) {
        setOrder(orderData);
        setCustomer(orderData.customers);
      }

      if (items) {
        setProducts(
          items.map((i) => ({
            ...i.products,
            quantity: i.quantity,
            price: i.price,
          })),
        );
      }

      if (ops) {
        const ordered = ops.sort((a, b) => a.operation_id - b.operation_id);
        setOperations(ordered);
      }
      if (companyData) setEmissor(companyData); // 👈 Aqui define o emissor com base no companyId
    };

    fetchAll();
  }, [id, companyId]);

  const handleEmit = async () => {
    if (loading) return; // evita cliques duplos

    const operacaoFiscal = operations.find((o) => o.id === selectedOperation);
    if (!operacaoFiscal)
      return toast.error("Selecione um tipo de operação fiscal");
    if (!customer) return toast.error("Cliente não encontrado");
    if (!emissor) return toast.error("Emissor não definido");
    if (products.length === 0) return toast.error("Nenhum produto na venda");

    setLoading(true); // ✅ inicia loading

    try {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const totalProdutos = products.reduce(
        (acc, p) => acc + Number(p.price) * p.quantity,
        0,
      );

      const icmsCode = String(
        operacaoFiscal.icms_situacao_tributaria ?? "",
      ).trim();

      if (icmsCode === "60") {
        const faltaST =
          operacaoFiscal.vbc_st_ret == null ||
          operacaoFiscal.pst == null ||
          operacaoFiscal.vicms_substituto == null ||
          operacaoFiscal.vicms_st_ret == null;

        if (faltaST) {
          toast.error(
            "Para ICMS 60 (ST) é obrigatório informar vbc_st_ret, pst, vicms_substituto e vicms_st_ret.",
          );
          setLoading(false);
          return;
        }
      }

      const items = products.map((p, index) => ({
        numero_item: index + 1,
        codigo_produto: String(p.code ?? ""),
        descricao: p.name ?? "",
        cfop: String(operacaoFiscal.cfop).padStart(4, "0"),
        unidade_comercial: p.unit ?? "UN",
        quantidade_comercial: Number(p.quantity),
        valor_unitario_comercial: Number(p.price),
        valor_unitario_tributavel: Number(p.price),
        unidade_tributavel: p.unit ?? "UN",
        codigo_ncm: String(operacaoFiscal.ncm).padStart(8, "0"),
        quantidade_tributavel: Number(p.quantity),
        valor_bruto: Number(p.price) * Number(p.quantity),
        icms_origem: String(operacaoFiscal.icms_origem ?? "0"),
        icms_situacao_tributaria: icmsCode,
        pis_situacao_tributaria: String(operacaoFiscal.pis ?? "").padStart(
          2,
          "0",
        ),
        cofins_situacao_tributaria: String(
          operacaoFiscal.cofins ?? "",
        ).padStart(2, "0"),
        ...(icmsCode === "60"
          ? {
              vbc_st_ret: Number(operacaoFiscal.vbc_st_ret),
              pst: Number(operacaoFiscal.pst),
              vicms_substituto: Number(operacaoFiscal.vicms_substituto),
              vicms_st_ret: Number(operacaoFiscal.vicms_st_ret),
            }
          : {}),
      }));

      const invoiceData = {
        ambiente: "1",
        note_number: order.note_number,
        order_id: id,
        data_emissao: hoje,
        data_entrada_saida: hoje,
        natureza_operacao: operacaoFiscal.natureza_operacao,
        tipo_documento: Number(operacaoFiscal.tipo_documento),
        finalidade_emissao: Number(operacaoFiscal.finalidade_emissao),
        modalidade_frete: 0,
        valor_frete: order.freight ? Number(order.freight) : 0,
        valor_seguro: 0,
        valor_produtos: totalProdutos,
        valor_total: totalProdutos,
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
        ...(customer.document?.replace(/\D/g, "").length === 14
          ? { cnpj_destinatario: customer.document.replace(/\D/g, "") }
          : { cpf_destinatario: customer.document.replace(/\D/g, "") }),
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
    <div className="p-6 space-y-4 ">
      <h1 className="text-xl font-bold">Emissão de NF-e</h1>
      <p>Revise os dados antes de emitir a nota</p>

      <Label>Tipo de Operação Fiscal</Label>
      <Select onValueChange={setSelectedOperation}>
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

      <div className="border p-4 rounded-md">
        <h2 className="font-medium">Produtos</h2>
        <ul className="text-sm mt-2">
          {products.map((p, i) => (
            <li key={i}>
              {p.name} - Qtd: {p.quantity} - R$: {p.price} - CFOP:{" "}
              {(selectedOperation &&
                operations.find((o) => o.id === selectedOperation)?.cfop) ||
                "--"}
            </li>
          ))}
        </ul>
      </div>

      <Button
        className="mt-4 flex items-center gap-2"
        onClick={handleEmit}
        disabled={loading || !selectedOperation}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Emitindo NF-e..." : "Emitir NF-e"}
      </Button>
    </div>
  );
}
