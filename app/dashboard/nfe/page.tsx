"use client";

import { useEffect, useState } from "react";
import { fetchOrders } from "@/lib/fetchOrders";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import DataFinancialTable from "@/components/financial/DataFinancialTable";
import { Order } from "@/components/types/order";
import FiscalOperationsPage from "@/components/nf/FiscalOperationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { InvoiceStatusIndicator } from "@/components/nf/InvoiceStatusIndicator";
import FetchLinksButton from "@/components/nf/FetchLinksButton";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoicesFilters } from "@/components/nf/InvoicesFilters";
import RefreshButton from "@/components/nf/RefreshButton";
import ViewDanfeButton from "@/components/nf/ViewDanfeButton";
import { Database } from "@/components/types/supabase";
import { InvoiceStatusButton } from "@/components/nf/InvoiceStatusButton";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

const supabase = createClientComponentClient<Database>();

export default function NfePage() {
  const { companyId, loading } = useAuthenticatedCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    customerName: "",
    numero: "",
    status: "all",
    natureza: "",
    valorTotal: "",
  });

  useEffect(() => {
    if (!companyId) return;
    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("data_emissao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notas fiscais:", error);
      } else {
        setInvoices(data);
      }
    };

    if (companyId) {
      fetchInvoices();
    }
  }, [companyId]);

  const filtered = invoices.filter((invoice) => {
    const matchesCustomer =
      !filters.customerName ||
      (invoice.customer_name &&
        invoice.customer_name
          .toLowerCase()
          .includes(filters.customerName.toLowerCase()));

    const matchesNumero =
      !filters.numero ||
      (invoice.numero &&
        invoice.numero.toLowerCase().includes(filters.numero.toLowerCase()));

    const matchesStatus =
      filters.status === "all" || invoice.status === filters.status;

    const matchesNatureza =
      !filters.natureza ||
      (invoice.natureza_operacao &&
        invoice.natureza_operacao
          .toLowerCase()
          .includes(filters.natureza.toLowerCase()));

    const matchesValor =
      !filters.valorTotal ||
      (invoice.valor_total &&
        invoice.valor_total.toString().includes(filters.valorTotal));

    return (
      matchesCustomer &&
      matchesNumero &&
      matchesStatus &&
      matchesNatureza &&
      matchesValor
    );
  });
  // helpers
  const isAuthorized = (s?: string) =>
    (s || "").toLowerCase().includes("autorizad");

  const isProcessing = (s?: string) =>
    (s || "").toLowerCase().trim() === "processando_autorizacao";

  // Mostra motivo se:
  // - bate em padrões comuns de erro/rejeição/denegação, OU
  // - fallback: não está processando, não está autorizado e não tem DANFE
  const shouldShowReason = (status?: string, danfeUrl?: string) => {
    const v = (status || "").toLowerCase().trim();
    const looksError =
      v.includes("erro") || v.includes("rejeit") || v.includes("deneg");
    const fallback = !isProcessing(v) && !isAuthorized(v) && !danfeUrl;
    return looksError || fallback;
  };

  const canShowDanfe = (s?: string, url?: string) => {
    const v = (s || "").toLowerCase().trim();
    return !!url && (v.includes("autorizad") || v.includes("cancelad"));
  };

  if (loading || !companyId) {
    return <TableSkeleton />;
  }

  return (
    <Tabs defaultValue="nfe" className="w-full px-6 mt-4 md:gap-6 md:py-6">
      <TabsList>
        <TabsTrigger value="nfe">NF-e</TabsTrigger>
        <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
      </TabsList>

      <TabsContent value="nfe">
        <h1 className="font-bold">📄 Notas Fiscais Emitidas</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Todas as notas emitidas pela sua empresa.
        </p>
        <InvoicesFilters filters={filters} setFilters={setFilters} />
        {invoices.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma nota emitida.</p>
        )}

        {filtered.map((invoice) => (
          <Card key={invoice.id} className="my-2">
            <CardHeader>
              <CardTitle className="flex gap-4 items-center">
                <InvoiceStatusIndicator status={invoice.status} />
                {invoice.customer_name || "Destinatário"}
              </CardTitle>

              <CardDescription className="flex gap-4 flex-wrap">
                <div>Nº NFe: {invoice.numero ?? "--"}</div>
                <div>Nº Pedido: {invoice.note_number ?? "--"}</div>
                <div>Natureza: {invoice.natureza_operacao || "Venda"}</div>
                <div>
                  Emissão:{" "}
                  {invoice.data_emissao
                    ? new Date(invoice.data_emissao).toLocaleDateString("pt-BR")
                    : "--"}
                </div>
                <div>
                  Valor Total:{" "}
                  {invoice.valor_total
                    ? `R$ ${Number(invoice.valor_total).toFixed(2)}`
                    : "R$ 0,00"}
                </div>
              </CardDescription>
              <CardAction className="flex gap-4">
                <Button asChild variant="secondary">
                  <Link
                    href={`/dashboard/orders/${invoice.order_id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver Espelho
                  </Link>
                </Button>
                {isProcessing(invoice.status) && (
                  <RefreshButton
                    refId={invoice.ref}
                    companyId={invoice.company_id}
                    setInvoices={setInvoices}
                  />
                )}

                {shouldShowReason(invoice.status, invoice.danfe_url) && (
                  <InvoiceStatusButton
                    refId={invoice.ref}
                    companyId={companyId!}
                  />
                )}

                {canShowDanfe(invoice.status, invoice.danfe_url) && (
                  <ViewDanfeButton
                    url={invoice.danfe_url}
                    ref={invoice.ref}
                    invoiceId={invoice.id}
                  />
                )}
                {/* se autorizada e sem danfe/xml, exibe o botão */}
                {isAuthorized(invoice.status) &&
                  (!invoice.danfe_url || !invoice.xml_url) && (
                    <FetchLinksButton
                      refId={invoice.ref}
                      companyId={invoice.company_id}
                      invoiceId={invoice.id}
                      setInvoices={setInvoices}
                    />
                  )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                    >
                      <IconDotsVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Cancelar</DropdownMenuItem>
                    <DropdownMenuItem>Inutilizar</DropdownMenuItem>
                    <DropdownMenuItem>Carta de Correção</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="cadastro">
        <FiscalOperationsPage />
      </TabsContent>
    </Tabs>
  );
}
