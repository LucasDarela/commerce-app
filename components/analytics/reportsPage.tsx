"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { X } from "lucide-react";
import { toast } from "sonner";

type SimpleCustomer = { id: string; name: string };

export default function ReportsPage() {
  const { companyId, loading } = useAuthenticatedCompany();

  // Filtros "ao vivo" (inputs)
  const [reportType, setReportType] = useState("stock_reservations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Cliente por NOME (autocomplete) -> salva ID só ao Gerar
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<SimpleCustomer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<SimpleCustomer | null>(null);

  // Outros filtros (mantidos para compatibilidade com seus outros relatórios)
  const [supplierFilter, setSupplierFilter] = useState("");

  // Params "congelados" (só mudam ao clicar em Gerar Relatório)
  const [params, setParams] = useState<{
    companyId: string;
    startDate: string;
    endDate?: string;
    customerId?: string;
    supplierFilter?: string;
    reportType: string;
  } | null>(null);

  // Debounce simples
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
    setCustomerQuery(c.name); // mostra o nome no input
    setShowCustomerList(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerOptions([]);
    setShowCustomerList(false);
  };

  const handleGenerate = () => {
    if (!companyId) return;

    // ✅ validações
    if (!startDate) {
      toast.error("Adicione a Data Inicial para gerar o relatório.");
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("A Data Final não pode ser anterior à Data Inicial.");
      return;
    }

    // aviso: digitou nome mas não escolheu da lista
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
      customerId: selectedCustomer?.id || undefined, // 🔒 ID só ao gerar
      supplierFilter: supplierFilter || undefined,
      reportType,
    });

    toast.success("Filtros aplicados. Gerando relatório…");
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Tipo de Relatório</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock_reservations">
                Reservas de Estoque
              </SelectItem>
              <SelectItem value="equipment_loans_history">
                Histórico de Comodatos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Data Inicial</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Data Final (opcional)</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleGenerate}
            className="w-full"
            disabled={!startDate}
          >
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Cliente (por nome) + Fornecedor (quando aplicável) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Autocomplete de cliente por NOME */}
        <div className="relative">
          <Label>Filtrar por Cliente (nome)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Digite o nome do cliente…"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setShowCustomerList(true);
                setSelectedCustomer(null); // Editou o texto → limpa seleção
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
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-sm max-h-64 overflow-y-auto">
              {customerOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()} // evita blur do input
                  onClick={() => handlePickCustomer(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {selectedCustomer && (
            <p className="text-xs text-muted-foreground mt-1">
              Selecionado: <strong>{selectedCustomer.name}</strong>
            </p>
          )}
        </div>

        <div>
          <Label>Filtrar por Fornecedor (opcional)</Label>
          <Input
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Usado apenas em <strong>Reservas de Estoque</strong>.
          </p>
        </div>
      </div>

      {/* Renderização SOMENTE após clicar em Gerar (usa params congelados) */}
      {params?.reportType === "stock_reservations" && params.companyId && (
        <StockReservationReport
          companyId={params.companyId}
          startDate={params.startDate}
          endDate={params.endDate}
          supplierFilter={params.supplierFilter}
        />
      )}

      {params?.reportType === "equipment_loans_history" && params.companyId && (
        <EquipmentLoansHistoryReport
          companyId={params.companyId}
          startDate={params.startDate}
          endDate={params.endDate}
          customerId={params.customerId} // ✅ ID só depois de "Gerar"
        />
      )}
    </div>
  );
}
