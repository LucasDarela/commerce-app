"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  EquipmentMovementPDF,
  type EquipmentMovementRow,
} from "@/components/pdf/EquipmentMovementPDF";

interface Props {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return format(new Date(`${date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

type LoanRow = {
  id: string;
  loan_date: string;
  return_date: string | null;
  customer_name: string | null;
  customer_id: string | null;
  quantity: number;
  note_number: string | null;
  equipmentName: string;
  // derived
  returnDateActual: string | null; // data real da devolução (do equipment_loan_returns)
  returnedQty: number | null;
  remainingQty: number | null;
};

export function EquipmentMovementReport({
  companyId,
  startDate,
  endDate,
  customerId,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-equipment-movement-report", handleDownload);
    return () =>
      window.removeEventListener("download-equipment-movement-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!companyId || !startDate) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Busca todos os comodatos do período, com equipamento e retornos vinculados
        let query = supabase
          .from("equipment_loans")
          .select(`
            id,
            loan_date,
            return_date,
            customer_name,
            customer_id,
            quantity,
            note_number,
            status,
            equipments(name),
            equipment_loan_returns(
              return_date,
              returned_quantity,
              remaining_quantity
            )
          `)
          .eq("company_id", companyId)
          .gte("loan_date", startDate)
          .order("loan_date", { ascending: true });

        if (endDate) query = query.lte("loan_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;

        if (error) {
          console.error("Erro ao buscar comodatos:", error);
          if (!cancelled) setRows([]);
          return;
        }

        const parsed: LoanRow[] = (data ?? []).map((r: any) => {
          // Pode haver múltiplos retornos; pega o mais recente
          const returns: any[] = r.equipment_loan_returns ?? [];
          const lastReturn = returns.sort(
            (a: any, b: any) =>
              new Date(b.return_date).getTime() - new Date(a.return_date).getTime()
          )[0] ?? null;

          return {
            id: r.id,
            loan_date: r.loan_date,
            return_date: r.return_date,
            customer_name: r.customer_name ?? "—",
            customer_id: r.customer_id,
            quantity: r.quantity ?? 0,
            note_number: r.note_number ?? null,
            equipmentName: r.equipments?.name ?? "—",
            returnDateActual: lastReturn?.return_date ?? null,
            returnedQty: lastReturn?.returned_quantity ?? null,
            remainingQty: lastReturn?.remaining_quantity ?? null,
          };
        });

        if (!cancelled) setRows(parsed);
      } catch (err) {
        console.error("Erro geral:", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const summary = useMemo(() => {
    const returned = rows.filter((r) => r.returnDateActual || r.return_date);
    const pending = rows.filter((r) => !r.returnDateActual && !r.return_date);
    return {
      total: rows.length,
      returned: returned.length,
      pending: pending.length,
      totalLoaned: rows.reduce((s, r) => s + r.quantity, 0),
    };
  }, [rows]);

  // Converte para o formato do PDF
  const pdfRows: EquipmentMovementRow[] = rows.flatMap((r) => {
    const events: EquipmentMovementRow[] = [
      {
        kind: "loan",
        dateISO: r.loan_date,
        dateLabel: formatDate(r.loan_date),
        customerName: r.customer_name ?? "—",
        equipmentName: r.equipmentName,
        quantity: r.quantity,
        remainingAfter: null,
        noteNumber: r.note_number,
      },
    ];
    if (r.returnDateActual) {
      events.push({
        kind: "return",
        dateISO: r.returnDateActual,
        dateLabel: formatDate(r.returnDateActual),
        customerName: r.customer_name ?? "—",
        equipmentName: r.equipmentName,
        quantity: r.returnedQty ?? 0,
        remainingAfter: r.remainingQty,
        noteNumber: r.note_number,
      });
    }
    return events;
  });

  const pdfSummary = {
    totalLoans: rows.length,
    totalReturns: summary.returned,
    totalLoaned: summary.totalLoaned,
    totalReturned: rows.reduce((s, r) => s + (r.returnedQty ?? 0), 0),
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* PDF download trigger oculto */}
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <EquipmentMovementPDF
                rows={pdfRows}
                startDate={startDate}
                endDate={endDate}
                summary={pdfSummary}
              />
            }
            fileName={`movimentacoes-equipamentos-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
          >
            {({ url }) => {
              if (url) {
                window.open(url, "_blank");
                setTimeout(() => setTriggerDownload(false), 300);
              }
              return null;
            }}
          </PDFDownloadLink>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total de Comodatos</p>
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalLoaned} un. entregues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Recolhidos</p>
            <p className="text-2xl font-bold">{summary.returned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Pendentes de Recolha</p>
            <p className="text-2xl font-bold">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Unidades Entregues</p>
            <p className="text-2xl font-bold">{summary.totalLoaned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela principal */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Data Entrega</TableHead>
                  <TableHead className="min-w-[110px]">Data Recolha</TableHead>
                  <TableHead className="min-w-[200px]">Cliente</TableHead>
                  <TableHead className="min-w-[180px]">Material / Equipamento</TableHead>
                  <TableHead className="min-w-[70px] text-center">Qtd.</TableHead>
                  <TableHead className="min-w-[90px] text-center">Recolhido</TableHead>
                  <TableHead className="min-w-[90px] text-center">Restante</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const hasReturn = !!(row.returnDateActual || row.return_date);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {formatDate(row.loan_date)}
                        </TableCell>
                        <TableCell>
                          {hasReturn
                            ? formatDate(row.returnDateActual ?? row.return_date)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="uppercase font-medium">
                          {row.customer_name ?? "—"}
                        </TableCell>
                        <TableCell>{row.equipmentName}</TableCell>
                        <TableCell className="text-center">{row.quantity}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.returnedQty ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.remainingQty != null ? row.remainingQty : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={hasReturn ? "secondary" : "outline"}>
                            {hasReturn ? "Recolhido" : "Em uso"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma movimentação encontrada para os filtros informados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
