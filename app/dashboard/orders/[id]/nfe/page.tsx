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

      if (ops) setOperations(ops);
      if (companyData) setEmissor(companyData); // 👈 Aqui define o emissor com base no companyId
    };

    fetchAll();
  }, [id, companyId]);

  const handleEmit = async () => {
    const operacaoFiscal = operations.find((o) => o.id === selectedOperation);
    if (!operacaoFiscal)
      return toast.error("Selecione um tipo de operação fiscal");
    if (!customer) return toast.error("Cliente não encontrado");
    if (!emissor) return toast.error("Emissor não definido");
    if (products.length === 0) return toast.error("Nenhum produto na venda");

    try {
      const response = await fetch("/api/nfe/create", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          invoiceData: {
            ambiente: "2",
            cliente: {
              nome: customer.name,
              cpf_cnpj: customer.document?.replace(/\D/g, "") ?? "",
              ie: customer.state_registration ?? "",
              endereco: {
                logradouro: customer.address,
                numero: customer.number ?? "S/N",
                bairro: customer.neighborhood ?? "",
                municipio: customer.city,
                uf: customer.state,
                cep: customer.zip_code?.replace(/\D/g, "") ?? "",
              },
            },
            produtos: products.map((p) => ({
              nome: p.name,
              codigo: p.code,
              ncm: p.ncm,
              cfop: operacaoFiscal.cfop,
              cst: operacaoFiscal.cst_icms,
              unidade: p.unit ?? "UN",
              quantidade: p.quantity,
              valor_unitario: Number(p.price),
              valor_total: Number(p.price) * p.quantity,
              pis: operacaoFiscal.pis,
              cofins: operacaoFiscal.cofins,
              ipi: operacaoFiscal.ipi,
            })),
            emissor: {
              razao_social: emissor.corporate_name,
              nome_fantasia: emissor.trade_name,
              cnpj: emissor.document?.replace(/\D/g, "") ?? "",
              ie: emissor.state_registration,
              endereco: {
                logradouro: emissor.address,
                numero: emissor.number ?? "S/N",
                bairro: emissor.neighborhood,
                municipio: emissor.city,
                uf: emissor.state,
                cep: emissor.zip_code?.replace(/\D/g, "") ?? "",
              },
            },
            natureza_operacao: operacaoFiscal.name,
            finalidade_emissao: "1",
            modelo: "55",
            pagamentos: [
              {
                forma_pagamento: mapPaymentMethod(order.payment_method),
                valor: Number(order.total),
              },
            ],
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro desconhecido");

      toast.success(
        `NF-e emitida com sucesso! Número: ${result.numero || "--"}`,
      );
      router.push("/dashboard/orders");
    } catch (err: any) {
      toast.error("Erro ao emitir NF-e: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">Emissão de NF-e</h1>

      <Label>Tipo de Operação Fiscal</Label>
      <Select onValueChange={setSelectedOperation}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma operação fiscal" />
        </SelectTrigger>
        <SelectContent>
          {operations.map((op) => (
            <SelectItem key={op.id} value={op.id}>
              {op.operation_id} - {op.name} - CFOP {op.cfop}
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
        className="mt-4"
        onClick={handleEmit}
        disabled={!selectedOperation}
      >
        Emitir NF-e
      </Button>
    </div>
  );
}
