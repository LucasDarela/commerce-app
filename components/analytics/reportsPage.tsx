// app/dashboard/reports/page.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
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
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { StockReservationReport } from "@/components/analytics/stockReservations";

export default function ReportsPage() {
  const { companyId } = useAuthenticatedCompany();
  const [reportType, setReportType] = useState("stock_reservations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  const [params, setParams] = useState({});

  const handleGenerate = () => {
    setParams({
      companyId,
      startDate,
      endDate,
      customerFilter,
      supplierFilter,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Relatórios</h1>

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
          <Button onClick={handleGenerate} className="w-full">
            Gerar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Filtrar por Cliente (ID)</Label>
          <Input
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
        </div>
        <div>
          <Label>Filtrar por Fornecedor (opcional)</Label>
          <Input
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          />
        </div>
      </div>

      {reportType === "stock_reservations" && companyId && (
        <StockReservationReport
          companyId={companyId}
          startDate={startDate}
          endDate={endDate}
          supplierFilter={supplierFilter}
        />
      )}
    </div>
  );
}
