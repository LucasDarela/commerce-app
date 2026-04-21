"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { StockReservationReport } from "@/components/analytics/stockReservations";
import { EquipmentLoansHistoryReport } from "@/components/analytics/EquipmentLoansHistoryReport";
import { EquipmentMovementReport } from "@/components/analytics/EquipmentMovementReport";
import { EquipmentByCustomerReport } from "@/components/analytics/EquipmentByCustomerReport";
import { EquipmentTrackerReport } from "@/components/analytics/EquipmentTrackerReport";
import {
  InvoicesByPeriodReport,
  InvoicesStatusReport,
  InvoicesByCustomerReport,
  FiscalOperationSummaryReport,
  PendingInvoicesReport,
  FiscalFieldIssuesReport,
} from "@/components/analytics/FiscalReports";
import {
  CashFlowReport,
  AccountsPayableReport,
  OverduePayablesReport,
  ExpensesByCategoryReport,
  RevenueVsExpenseReport,
  MonthlyFinancialSummaryReport,
} from "@/components/analytics/FinancialReports";
import {
  StockMovementsReport,
  CurrentStockPositionReport,
  LowStockProductsReport,
  ReturnsByProductReport,
} from "@/components/analytics/StockReports";
import {
  OverdueReceivablesReport,
  ReceiptsByPeriodReport,
  CustomerDefaultReport,
  SalesByProductReport,
  TopCustomersReport,
  CustomerFullStatementReport,
  SalesByVolumeReport,
} from "@/components/analytics/SalesAnalyticsReports";
import {
  EquipmentNotReturnedReport,
  EquipmentAvailableVsLoanedReport,
} from "@/components/analytics/EquipmentAnalyticsReports";
import {
  CustomerHistoryReport,
  ActiveInactiveCustomersReport,
  NewCustomersByPeriodReport,
  CustomersByPriceTableReport,
} from "@/components/analytics/CustomerReports";
import { TableSkeleton } from "../ui/TableSkeleton";
import { X, Filter, FileText, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesByPeriodReport } from "./SalesByPeriodReport";
import { SalesGroupedByCustomerReport } from "./SalesGroupedByCustomerReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type SimpleCustomer = { id: string; name: string };

type ReportParams = {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
  supplierFilter?: string;
  equipmentFilter?: string;
  reportType: string;
};

const REPORT_OPTIONS: { value: string; label: string; group: string; disabled?: boolean }[] = [
  // Vendas
  { value: "sales_by_period", label: "Vendas por Período", group: "vendas" },
  { value: "sales_grouped_by_customer", label: "Vendas Agrupadas por Cliente", group: "vendas" },
  { value: "overdue_receivables", label: "Contas a Receber Vencidas", group: "vendas" },
  { value: "customer_statement", label: "Extrato por Cliente", group: "vendas" },
  { value: "receipts_by_period", label: "Recebimentos por Período", group: "vendas" },
  { value: "customer_default", label: "Inadimplência por Cliente", group: "vendas" },
  { value: "sales_by_product", label: "Vendas por Produto", group: "vendas" },
  { value: "top_customers", label: "Clientes que Mais Compram", group: "vendas" },
  { value: "sales_by_volume", label: "Vendas por Litragem", group: "vendas" },
  // Financeiro
  { value: "cash_flow", label: "Fluxo de Caixa por Período", group: "financeiro" },
  { value: "accounts_payable", label: "Contas a Pagar", group: "financeiro" },
  { value: "overdue_payables", label: "Contas a Pagar Vencidas", group: "financeiro" },
  { value: "expenses_by_category", label: "Despesas por Categoria", group: "financeiro" },
  { value: "revenue_vs_expense", label: "Receita x Despesa", group: "financeiro" },
  { value: "monthly_financial_summary", label: "Resumo Financeiro Mensal", group: "financeiro" },
  // Estoque
  { value: "stock_reservations", label: "Reservas de Estoque", group: "estoque" },
  { value: "stock_movements", label: "Estoque / Movimentações", group: "estoque" },
  { value: "current_stock_position", label: "Posição Atual de Estoque", group: "estoque" },
  { value: "low_stock", label: "Produtos com Estoque Baixo", group: "estoque" },
  { value: "product_returns", label: "Devoluções por Produto", group: "estoque" },
  // Clientes
  { value: "customer_statement_full", label: "Histórico Completo por Cliente", group: "clientes" },
  { value: "active_inactive_customers", label: "Clientes Ativos e Inativos", group: "clientes" },
  { value: "new_customers_by_period", label: "Novos Clientes por Período", group: "clientes" },
  { value: "customer_price_tables", label: "Clientes por Tabela de Preço", group: "clientes" },
  // Equipamentos
  { value: "equipment_loans_history", label: "Histórico de Comodatos", group: "equipamentos" },
  { value: "equipment_movement_history", label: "Movimentações de Equipamentos", group: "equipamentos" },
  { value: "equipment_by_customer", label: "Equipamentos por Cliente", group: "equipamentos" },
  { value: "equipment_tracker", label: "Rastreio de Equipamento", group: "equipamentos" },
  { value: "unreturned_equipments", label: "Equipamentos Não Retornados", group: "equipamentos" },
  { value: "available_vs_loaned_equipments", label: "Equipamentos Disponíveis x Emprestados", group: "equipamentos" },
  // Fiscal
  { value: "issued_invoices", label: "NF-e Emitidas por Período", group: "fiscal" },
  { value: "invoice_status", label: "NF-e Autorizadas / Rejeitadas", group: "fiscal" },
  { value: "invoices_by_customer", label: "NF-e por Cliente", group: "fiscal" },
  { value: "fiscal_operation_summary", label: "Resumo Fiscal por Operação", group: "fiscal" },
  { value: "pending_invoice_issuance", label: "Notas Pendentes de Emissão", group: "fiscal" },
  { value: "fiscal_field_issues", label: "Divergências Fiscais de Produtos", group: "fiscal" },
];

export default function ReportsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();

  const [reportType, setReportType] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<SimpleCustomer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<SimpleCustomer | null>(null);

  const [supplierFilter, setSupplierFilter] = useState("");

  // Equipamento autocomplete
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState<{ id: string; name: string }[]>([]);
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<{ id: string; name: string } | null>(null);

  const [params, setParams] = useState<ReportParams | null>(null);

  const debounceRef = useRef<number | null>(null);
  const equipDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!companyId) return;

    const q = customerQuery.trim();

    if (q.length < 2) {
      setCustomerOptions([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${q}%`)
        .order("name", { ascending: true })
        .limit(20);

      if (cancelled) return;

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        return;
      }

      setCustomerOptions((data as SimpleCustomer[]) || []);
    }, 250);

    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [companyId, customerQuery, supabase]);

  // Busca equipamentos cadastrados
  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;
    const q = equipmentQuery.trim();
    if (q.length < 2) { setEquipmentOptions([]); return; }
    if (equipDebounceRef.current) window.clearTimeout(equipDebounceRef.current);
    equipDebounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${q}%`)
        .order("name", { ascending: true })
        .limit(20);
      if (cancelled) return;
      if (!error) setEquipmentOptions(data ?? []);
    }, 250);
    return () => {
      cancelled = true;
      if (equipDebounceRef.current) window.clearTimeout(equipDebounceRef.current);
    };
  }, [companyId, equipmentQuery, supabase]);

  const handlePickCustomer = (c: SimpleCustomer) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setShowCustomerList(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerOptions([]);
    setShowCustomerList(false);
  };

  const handlePickEquipment = (e: { id: string; name: string }) => {
    setSelectedEquipment(e);
    setEquipmentQuery(e.name);
    setShowEquipmentList(false);
  };

  const clearEquipment = () => {
    setSelectedEquipment(null);
    setEquipmentQuery("");
    setEquipmentOptions([]);
    setShowEquipmentList(false);
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setCustomerQuery("");
    setCustomerOptions([]);
    setSelectedCustomer(null);
    setSupplierFilter("");
    setEquipmentQuery("");
    setEquipmentOptions([]);
    setSelectedEquipment(null);
    setParams(null);
    setReportType("");
  };

  const handleGenerate = () => {
    if (!companyId) return;

    if (!startDate) {
      toast.error("Adicione a Data Inicial para gerar o relatório.");
      return;
    }

    if (!reportType) {
      toast.error("Selecione o tipo de relatório.");
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("A Data Final não pode ser anterior à Data Inicial.");
      return;
    }

    if (customerQuery.trim() && !selectedCustomer) {
      toast.error(
        "Selecione um cliente da lista para aplicar o filtro por cliente.",
      );
      return;
    }

    setParams({
      companyId,
      startDate,
      endDate: endDate || undefined,
      customerId: selectedCustomer?.id || undefined,
      supplierFilter: supplierFilter || undefined,
      equipmentFilter: selectedEquipment?.name || equipmentQuery || undefined,
      reportType,
    });

    toast.success("Filtros aplicados. Gerando relatório…");
  };

  const normalizedReportType = String(reportType || "").trim();

  const showDownloadButton = !!normalizedReportType && !!params;

  if (loading) return <TableSkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Gere relatórios por período e aplique filtros específicos conforme o
            tipo selecionado.
          </p>
        </div>

        {showDownloadButton ? (
          <Button
            variant="outline"
            className="shrink-0 gap-2"
            disabled={!params}
            onClick={() =>
              window.dispatchEvent(
                new Event(`download-${normalizedReportType.replace(/_/g, "-")}-report`),
              )
            }
          >
            <FileText className="h-4 w-4" />
            Baixar PDF
          </Button>
        ) : (
          <div className="w-[140px]" />
        )}
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Popover open={reportOpen} onOpenChange={setReportOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={reportOpen}
                    className="min-w-[260px] max-w-[360px] w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {reportType
                        ? REPORT_OPTIONS.find((o) => o.value === reportType)?.label
                        : "Selecione um relatório"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="min-w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar relatório..." />
                    <CommandList>
                      <CommandEmpty>Nenhum relatório encontrado.</CommandEmpty>

                      <CommandGroup heading="Vendas e Recebimentos">
                        {REPORT_OPTIONS.filter((o) => o.group === "vendas").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandSeparator />

                      <CommandGroup heading="Financeiro">
                        {REPORT_OPTIONS.filter((o) => o.group === "financeiro").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandSeparator />

                      <CommandGroup heading="Estoque">
                        {REPORT_OPTIONS.filter((o) => o.group === "estoque").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandSeparator />

                      <CommandGroup heading="Clientes">
                        {REPORT_OPTIONS.filter((o) => o.group === "clientes").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandSeparator />

                      <CommandGroup heading="Equipamentos e Comodato">
                        {REPORT_OPTIONS.filter((o) => o.group === "equipamentos").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandSeparator />

                      <CommandGroup heading="Fiscal">
                        {REPORT_OPTIONS.filter((o) => o.group === "fiscal").map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label}
                            disabled={o.disabled}
                            onSelect={() => {
                              setReportType(o.value);
                              setReportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", reportType === o.value ? "opacity-100" : "opacity-0")} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={handleGenerate}
                className="flex-1"
                disabled={!startDate}
              >
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={clearAllFilters}
              >
                Limpar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label>Filtrar por Cliente</Label>

              <div className="flex gap-2">
                <Input
                  placeholder="Digite o nome do cliente…"
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setShowCustomerList(true);
                    setSelectedCustomer(null);
                  }}
                  onFocus={() =>
                    setShowCustomerList(customerQuery.trim().length >= 2)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowCustomerList(false), 150)
                  }
                />

                {customerQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearCustomer}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {showCustomerList && customerOptions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
                  {customerOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickCustomer(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  Cliente selecionado:{" "}
                  <span className="font-medium text-foreground">
                    {selectedCustomer.name}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Fornecedor</Label>
              <Input
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                placeholder="Opcional"
              />
              <p className="text-xs text-muted-foreground">
                Usado apenas em <strong>Reservas de Estoque</strong>.
              </p>
            </div>

            <div className="space-y-2 relative">
              <Label>Filtrar por Equipamento</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o nome do equipamento..."
                  value={equipmentQuery}
                  onChange={(e) => {
                    setEquipmentQuery(e.target.value);
                    setShowEquipmentList(true);
                    setSelectedEquipment(null);
                  }}
                  onFocus={() => setShowEquipmentList(equipmentQuery.trim().length >= 2)}
                  onBlur={() => setTimeout(() => setShowEquipmentList(false), 150)}
                />
                {equipmentQuery && (
                  <Button type="button" variant="ghost" onClick={clearEquipment} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {showEquipmentList && equipmentOptions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
                  {equipmentOptions.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => handlePickEquipment(e)}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              )}

              {selectedEquipment && (
                <p className="text-xs text-muted-foreground">
                  Equipamento: <span className="font-medium text-foreground">{selectedEquipment.name}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Usado em <strong>Rastreio</strong> e <strong>Equip. por Cliente</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {params?.reportType === "sales_by_period" && params.companyId && (
        <SalesByPeriodReport
          companyId={params.companyId}
          startDate={params.startDate}
          endDate={params.endDate}
          customerId={params.customerId}
        />
      )}

      {params?.reportType === "sales_grouped_by_customer" &&
        params.companyId && (
          <SalesGroupedByCustomerReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

      {params && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">Tipo:</strong>{" "}
                {
                  params.reportType === "stock_reservations" ? "Reservas de Estoque"
                  : params.reportType === "equipment_loans_history" ? "Histórico de Comodatos"
                  : params.reportType === "equipment_movement_history" ? "Movimentações de Equipamentos"
                  : params.reportType === "equipment_by_customer" ? "Equipamentos por Cliente"
                  : params.reportType === "equipment_tracker" ? "Rastreio de Equipamento"
                  : params.reportType === "sales_grouped_by_customer" ? "Vendas Agrupadas por Cliente"
                  : params.reportType === "cash_flow" ? "Fluxo de Caixa por Período"
                  : params.reportType === "accounts_payable" ? "Contas a Pagar"
                  : params.reportType === "overdue_payables" ? "Contas a Pagar Vencidas"
                  : params.reportType === "expenses_by_category" ? "Despesas por Categoria"
                  : params.reportType === "revenue_vs_expense" ? "Receita x Despesa"
                  : params.reportType === "monthly_financial_summary" ? "Resumo Financeiro Mensal"
                  : params.reportType === "stock_movements" ? "Estoque / Movimentações"
                  : params.reportType === "current_stock_position" ? "Posição Atual de Estoque"
                  : params.reportType === "low_stock" ? "Produtos com Estoque Baixo"
                  : params.reportType === "product_returns" ? "Devoluções por Produto"
                  : params.reportType === "overdue_receivables" ? "Contas a Receber Vencidas"
                  : params.reportType === "customer_statement" ? "Extrato por Cliente"
                  : params.reportType === "receipts_by_period" ? "Recebimentos por Período"
                  : params.reportType === "customer_default" ? "Inadimplência por Cliente"
                  : params.reportType === "sales_by_product" ? "Vendas por Produto"
                  : params.reportType === "top_customers" ? "Clientes que Mais Compram"
                  : params.reportType === "sales_by_volume" ? "Vendas por Litragem"
                  : params.reportType === "unreturned_equipments" ? "Equipamentos Não Retornados"
                  : params.reportType === "available_vs_loaned_equipments" ? "Equipamentos Disponíveis x Emprestados"
                  : "Vendas por Período"
                }
              </span>

              <span>
                <strong className="text-foreground">Período:</strong>{" "}
                {params.startDate.split("-").reverse().join("/")}
                {params.endDate ? ` até ${params.endDate.split("-").reverse().join("/")}` : ""}
              </span>

              {selectedCustomer && (
                <span>
                  <strong className="text-foreground">Cliente:</strong>{" "}
                  {selectedCustomer.name}
                </span>
              )}

              {params.supplierFilter && (
                <span>
                  <strong className="text-foreground">Fornecedor:</strong>{" "}
                  {params.supplierFilter}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Estoque */}
        {params?.reportType === "stock_movements" && params.companyId && (
          <StockMovementsReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "current_stock_position" && params.companyId && (
          <CurrentStockPositionReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "low_stock" && params.companyId && (
          <LowStockProductsReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "product_returns" && params.companyId && (
          <ReturnsByProductReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "stock_reservations" && params.companyId && (
          <StockReservationReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            supplierFilter={params.supplierFilter}
          />
        )}

        {/* Equipamentos Avançado */}
        {params?.reportType === "unreturned_equipments" && params.companyId && (
          <EquipmentNotReturnedReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "available_vs_loaned_equipments" && params.companyId && (
          <EquipmentAvailableVsLoanedReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "equipment_loans_history" &&
          params.companyId && (
            <EquipmentLoansHistoryReport
              companyId={params.companyId}
              startDate={params.startDate}
              endDate={params.endDate}
              customerId={params.customerId}
            />
          )}

        {params?.reportType === "equipment_movement_history" &&
          params.companyId && (
            <EquipmentMovementReport
              companyId={params.companyId}
              startDate={params.startDate}
              endDate={params.endDate}
              customerId={params.customerId}
            />
          )}

        {params?.reportType === "equipment_by_customer" &&
          params.companyId && (
            <EquipmentByCustomerReport
              companyId={params.companyId}
              startDate={params.startDate}
              endDate={params.endDate}
              customerId={params.customerId}
            />
          )}

        {params?.reportType === "equipment_tracker" &&
          params.companyId && (
            <EquipmentTrackerReport
              companyId={params.companyId}
              startDate={params.startDate}
              endDate={params.endDate}
              equipmentFilter={params.equipmentFilter ?? ""}
            />
          )}

        {/* Relatórios Financeiros */}
        {params?.reportType === "cash_flow" && params.companyId && (
          <CashFlowReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "accounts_payable" && params.companyId && (
          <AccountsPayableReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "overdue_payables" && params.companyId && (
          <OverduePayablesReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "expenses_by_category" && params.companyId && (
          <ExpensesByCategoryReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "revenue_vs_expense" && params.companyId && (
          <RevenueVsExpenseReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "monthly_financial_summary" && params.companyId && (
          <MonthlyFinancialSummaryReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {/* Vendas e Recebíveis */}
        {params?.reportType === "overdue_receivables" && params.companyId && (
          <OverdueReceivablesReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {params?.reportType === "receipts_by_period" && params.companyId && (
          <ReceiptsByPeriodReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {params?.reportType === "customer_default" && params.companyId && (
          <CustomerDefaultReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {params?.reportType === "sales_by_product" && params.companyId && (
          <SalesByProductReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {params?.reportType === "top_customers" && params.companyId && (
          <TopCustomersReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {params?.reportType === "customer_statement" && params.companyId && (
          <CustomerFullStatementReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {params?.reportType === "sales_by_volume" && params.companyId && (
          <SalesByVolumeReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}

        {/* Relatórios Fiscais */}
        {params?.reportType === "issued_invoices" && params.companyId && (
          <InvoicesByPeriodReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "invoice_status" && params.companyId && (
          <InvoicesStatusReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "invoices_by_customer" && params.companyId && (
          <InvoicesByCustomerReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}
        {params?.reportType === "fiscal_operation_summary" && params.companyId && (
          <FiscalOperationSummaryReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "pending_invoice_issuance" && params.companyId && (
          <PendingInvoicesReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "fiscal_field_issues" && params.companyId && (
          <FiscalFieldIssuesReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}

        {/* Relatórios de Clientes */}
        {params?.reportType === "customer_statement_full" && params.companyId && (
          <CustomerHistoryReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            customerId={params.customerId}
          />
        )}
        {params?.reportType === "active_inactive_customers" && params.companyId && (
          <ActiveInactiveCustomersReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "new_customers_by_period" && params.companyId && (
          <NewCustomersByPeriodReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
        {params?.reportType === "customer_price_tables" && params.companyId && (
          <CustomersByPriceTableReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
          />
        )}
      </div>
    </div>
  );
}