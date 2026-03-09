"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { StockReservationReport } from "@/components/analytics/stockReservations";
import { EquipmentLoansHistoryReport } from "@/components/analytics/EquipmentLoansHistoryReport";
import { TableSkeleton } from "../ui/TableSkeleton";
import { supabase } from "@/lib/supabase";
import { X, Filter, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesByPeriodReport } from "./SalesByPeriodReport";

type SimpleCustomer = { id: string; name: string };

export default function ReportsPage() {
  const { companyId, loading } = useAuthenticatedCompany();

  const [reportType, setReportType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<SimpleCustomer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<SimpleCustomer | null>(null);

  const [supplierFilter, setSupplierFilter] = useState("");

  const [params, setParams] = useState<{
    companyId: string;
    startDate: string;
    endDate?: string;
    customerId?: string;
    supplierFilter?: string;
    reportType: string;
  } | null>(null);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
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

      if (!error && data) setCustomerOptions(data as SimpleCustomer[]);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [companyId, customerQuery]);

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

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setCustomerQuery("");
    setCustomerOptions([]);
    setSelectedCustomer(null);
    setSupplierFilter("");
    setParams(null);
  };

  const handleGenerate = () => {
    if (!companyId) return;

    if (!startDate) {
      toast.error("Adicione a Data Inicial para gerar o relatório.");
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
      reportType,
    });

    toast.success("Filtros aplicados. Gerando relatório…");
  };

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

        {params?.reportType === "sales_by_period" && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.dispatchEvent(new Event("download-sales-report"))}
          >
            <FileText className="h-4 w-4" />
            Baixar PDF
          </Button>
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
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="min-w-[220px] max-w-[300px] w-full">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_by_period">Vendas por Período</SelectItem>
                  <SelectItem value="stock_reservations">
                    Reservas de Estoque
                  </SelectItem>
                  <SelectItem value="equipment_loans_history">
                    Histórico de Comodatos
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
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

      {params && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">Tipo:</strong>{" "}
              {params.reportType === "stock_reservations"
                ? "Reservas de Estoque"
                : params.reportType === "equipment_loans_history"
                  ? "Histórico de Comodatos"
                  : "Vendas por Período"}
            </span>

              <span>
                <strong className="text-foreground">Período:</strong>{" "}
                {params.startDate}
                {params.endDate ? ` até ${params.endDate}` : ""}
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
        {params?.reportType === "stock_reservations" && params.companyId && (
          <StockReservationReport
            companyId={params.companyId}
            startDate={params.startDate}
            endDate={params.endDate}
            supplierFilter={params.supplierFilter}
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
      </div>
    </div>
  );
}