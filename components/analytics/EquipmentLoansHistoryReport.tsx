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
import { GenericReportPDF } from "@/components/pdf/GenericReportPDF";

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
  status: string | null;
  equipmentName: string;
  returnDateActual: string | null;
  returnedQty: number | null;
  remainingQty: number | null;
};

export function EquipmentLoansHistoryReport({
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
    window.addEventListener("download-equipment-loans-history-report", handleDownload);
    return () => window.removeEventListener("download-equipment-loans-history-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!companyId || !startDate) { setLoading(false); return; }
      setLoading(true);

      try {
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
          .order("loan_date", { ascending: false });

        if (endDate) query = query.lte("loan_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;
        if (error) { console.error(error); if (!cancelled) setRows([]); return; }

        const parsed: LoanRow[] = (data ?? []).map((r: any) => {
          const returns: any[] = r.equipment_loan_returns ?? [];
          const last = returns.sort((a: any, b: any) =>
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
            status: r.status ?? null,
            equipmentName: r.equipments?.name ?? "—",
            returnDateActual: last?.return_date ?? null,
            returnedQty: last?.returned_quantity ?? null,
            remainingQty: last?.remaining_quantity ?? null,
          };
        });

        if (!cancelled) setRows(parsed);
      } catch (err) {
        console.error(err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const summary = useMemo(() => {
    const returned = rows.filter((r) => r.returnDateActual || r.return_date);
    return {
      total: rows.length,
      returned: returned.length,
      pending: rows.length - returned.length,
      totalLoaned: rows.reduce((s, r) => s + r.quantity, 0),
    };
  }, [rows]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Histórico de Comodatos / Empréstimos"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""} ${customerId ? `(Cliente específico)` : ""}`}
                summary={[
                  { label: "Total de Comodatos", value: String(summary.total) },
                  { label: "Recolhidos", value: String(summary.returned) },
                  { label: "Pendentes", value: String(summary.pending) },
                  { label: "Unidades Entregues", value: String(summary.totalLoaned) },
                ]}
                columns={[
                  { label: "Data Entrega", key: "dateFormatted", width: "15%" },
                  { label: "Data Recolha", key: "returnDateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer_name", width: "30%" },
                  { label: "Equipamento", key: "equipmentName", width: "30%" },
                  { label: "Qtd", key: "quantity", width: "10%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.loan_date),
                  returnDateFormatted: formatDate(r.returnDateActual ?? r.return_date),
                }))}
              />
            }
            fileName={`historico-comodatos-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
        {[
          { label: "Total de Comodatos", value: String(summary.total) },
          { label: "Recolhidos", value: String(summary.returned) },
          { label: "Pendentes", value: String(summary.pending) },
          { label: "Unidades Entregues", value: String(summary.totalLoaned) },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Data Entrega</TableHead>
                  <TableHead className="min-w-[110px]">Data Recolha</TableHead>
                  <TableHead className="min-w-[200px]">Cliente</TableHead>
                  <TableHead className="min-w-[180px]">Equipamento</TableHead>
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
                        <TableCell className="font-medium">{formatDate(row.loan_date)}</TableCell>
                        <TableCell>
                          {hasReturn
                            ? formatDate(row.returnDateActual ?? row.return_date)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="uppercase font-medium">{row.customer_name}</TableCell>
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
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Nenhum comodato encontrado para os filtros informados.
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