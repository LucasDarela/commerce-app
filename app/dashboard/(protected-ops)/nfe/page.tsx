"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { fetchOrders } from "@/lib/fetchOrders";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import DataFinancialTable from "@/components/financial/DataFinancialTable";
import { Order } from "@/components/types/order";
import FiscalOperationsPage from "@/components/nf/FiscalOperationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { InvoiceStatusIndicator } from "@/components/nf/InvoiceStatusIndicator";
import ViewXmlButton from "@/components/nf/ViewXmlButton";
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
import ViewDanfeButton from "@/components/nf/ViewDanfeButton";
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
import { NfeActionsDropdown } from "@/components/nf/NfeActionsDropdown";

export default function NfePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    customerName: "",
    numero: "",
    status: "all",
    natureza: "",
    valorTotal: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

useEffect(() => {
  if (!companyId) return;

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        company_id,
        order_id,
        customer_name,
        numero,
        serie,
        note_number,
        natureza_operacao,
        valor_total,
        status,
        data_emissao,
        danfe_url,
        xml_url,
        ref,
        created_at
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    console.log("companyId:", companyId);
    console.log("invoices error:", error);
    console.log("invoices data:", data);

    if (error) {
      console.error("Erro ao buscar notas fiscais:", error);
      setInvoices([]);
      return;
    }

    setInvoices(data ?? []);
  };

  fetchInvoices();
}, [companyId, supabase]);

  // === 1. Auto-Polling: notas em processamento E notas autorizadas sem links ===
  // Map: invoiceId → número de falhas consecutivas. Após MAX_RETRIES, para de tentar.
  const fetchLinksFailures = useRef<Map<string, number>>(new Map());
  const MAX_LINK_RETRIES = 3;

  useEffect(() => {
    if (!companyId || invoices.length === 0) return;

    const processingInvoices = invoices.filter((i) => isProcessing(i.status));

    // Notas mais antigas que 30 dias provavelmente não existirão mais na Focus NFe;
    // só tentamos buscar links de notas recentes para evitar 502 em loop.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const authorizedWithoutLinks = invoices.filter(
      (i) =>
        isAuthorized(i.status) &&
        (!i.danfe_url || !i.xml_url) &&
        // Só notas criadas nos últimos 30 dias
        new Date(i.created_at) >= thirtyDaysAgo &&
        // Só inclui notas que ainda não esgotaram as tentativas
        (fetchLinksFailures.current.get(i.id) ?? 0) < MAX_LINK_RETRIES,
    );

    if (processingInvoices.length === 0 && authorizedWithoutLinks.length === 0)
      return;

    // Ref para contrôle de chamadas em andamento (evita sobreposicao)
    const inFlight = new Set<string>();

    const intervalId = setInterval(() => {
      // Polling de status apenas para notas que REALMENTE estão processando
      processingInvoices.forEach(async (inv) => {
        try {
          await fetch("/api/nfe/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: inv.ref, companyId }),
          });
        } catch (_) {}
      });

      // Busca automática de links apenas para notas RECENTES e com poucas tentativas
      authorizedWithoutLinks.forEach(async (inv) => {
        if (inFlight.has(inv.id)) return;
        const fails = fetchLinksFailures.current.get(inv.id) ?? 0;
        if (fails >= MAX_LINK_RETRIES) return;

        inFlight.add(inv.id);
        try {
          await fetch("/api/nfe/fetch-links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ref: inv.ref,
              companyId,
              invoiceId: inv.id,
            }),
          });
          // Nota: O Realtime se encarrega de atualizar a UI quando o banco mudar
        } catch (_) {
          fetchLinksFailures.current.set(inv.id, fails + 1);
        } finally {
          inFlight.delete(inv.id);
        }
      });
    }, 20000); // Aumentado para 20 segundos (Redução de 60% nas chamadas de polling)

    return () => clearInterval(intervalId);
  }, [companyId, invoices]);

  // === 2. Supabase Realtime para captar o que o Polling atualizou no DB ===
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('custom-invoices-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `company_id=eq.${companyId}` },
        (payload) => {
          setInvoices((prev) => {
            if (payload.eventType === 'INSERT') {
              if (!prev.find(i => i.id === payload.new.id)) return [payload.new, ...prev];
              return prev;
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(inv => inv.id === payload.new.id ? { ...inv, ...payload.new } : inv);
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(inv => inv.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, supabase]);

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

  const sortedInvoices = filtered.sort((a, b) => {
    // Se 'a' não tem número e 'b' tem, 'a' vem primeiro
    if (!a.numero && b.numero) return -1;
    // Se 'b' não tem número e 'a' tem, 'b' vem primeiro
    if (a.numero && !b.numero) return 1;

    // Ambos têm número → ordenar do maior para o menor
    const numA = Number(a.numero);
    const numB = Number(b.numero);

    return numB - numA;
  });

  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
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
        {paginatedInvoices.slice().map((invoice) => (
          <Card key={invoice.id} className="my-2">
            <CardHeader>
              {/* Nome do cliente */}
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full overflow-hidden">
                <span className="flex-shrink-0">
                  <InvoiceStatusIndicator status={invoice.status} />
                </span>
                <span className="font-bold text-lg break-words line-clamp-2">
                  {invoice.customer_name || "Destinatário"}
                </span>
              </CardTitle>

              {/* Informações */}
              <CardDescription className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>Nº NFe: {invoice.numero ?? "--"}</div>
                <div>Nº Pedido: {invoice.note_number ?? "--"}</div>
                <div>Natureza: {invoice.natureza_operacao || "Venda"}</div>
                <div>
                  Emissão:{" "}
                  {invoice.data_emissao
                    ? new Date(invoice.data_emissao).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })
                    : "--"}
                </div>
                <div>
                  Valor Total:{" "}
                  {invoice.valor_total
                    ? `R$ ${Number(invoice.valor_total).toFixed(2)}`
                    : "R$ 0,00"}
                </div>
              </CardDescription>
            </CardHeader>

            {/* Botões no rodapé */}
            <CardFooter className="flex flex-wrap items-center gap-2 mt-2 w-full px-4 pb-4 [&_button]:h-8 [&_button]:text-xs [&_button]:px-3 [&_a]:h-8 [&_a]:text-xs [&_a]:px-3 [&_a]:flex [&_a]:items-center [&_a]:justify-center">
              <Button asChild variant="secondary" size="sm">
                <Link
                  href={`/dashboard/orders/${invoice.order_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver Espelho
                </Link>
              </Button>

              {shouldShowReason(invoice.status, invoice.danfe_url) && (
                <InvoiceStatusButton
                  refId={invoice.ref}
                  companyId={companyId!}
                />
              )}


              {canShowDanfe(invoice.status, invoice.danfe_url) && (
                <>
                  <ViewDanfeButton
                    url={invoice.danfe_url}
                    ref={invoice.ref}
                    invoiceId={invoice.id}
                  />

                  <ViewXmlButton
                    xmlUrl={invoice.xml_url}
                    refId={invoice.ref}
                    companyId={companyId}
                    invoiceId={invoice.id}
                    onUpdated={async () => {
                      const { data } = await supabase
                        .from("invoices")
                        .select("*")
                        .eq("company_id", companyId)
                        .order("numero", { ascending: false });

                      if (data) setInvoices(data);
                    }}
                  />
                </>
              )}
              

              {isAuthorized(invoice.status) &&
                (!invoice.danfe_url || !invoice.xml_url) && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    ⏳ Buscando XML/DANFE...
                  </span>
                )}
              <NfeActionsDropdown
                refId={invoice.ref}
                companyId={companyId}
                status={invoice.status}
                numero={invoice.numero}
                serie={invoice.serie}
              />
            </CardFooter>
          </Card>
        ))}
        {/* Paginação */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm">
            Página {currentPage} de {totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <IconChevronsLeft />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="cadastro">
        <FiscalOperationsPage />
      </TabsContent>
    </Tabs>
  );
}
