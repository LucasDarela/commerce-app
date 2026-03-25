"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { SalesByPeriodPDF } from "@/components/pdf/SalesByPeriodPDF";

type SalesByPeriodReportProps = {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
};

type OrderRow = {
  id: string;
  note_number: string | number | null;
  appointment_date: string | null;
  due_date: string | null;
  customer: string | null;
  products: string | null;
  total: number | null;
  total_payed: number | null;
  payment_status: string | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string | null) {
  if (!date) return "—";

  try {
    return format(new Date(`${date}T12:00:00`), "dd/MM/yyyy", {
      locale: ptBR,
    });
  } catch {
    return date;
  }
}

function translatePaymentStatus(status: string | null) {
  switch (status) {
    case "Paid":
      return "Pago";
    case "Pending":
    case "Unpaid":
      return "Não Pago";
    case "Partial":
      return "Parcial";
    default:
      return status || "—";
  }
}

function getStatusVariant(status: string | null) {
  switch (status) {
    case "Paid":
      return "default";
    case "Partial":
      return "secondary";
    case "Pending":
    case "Unpaid":
      return "outline";
    default:
      return "outline";
  }
}

export function SalesByPeriodReport({
  companyId,
  startDate,
  endDate,
  customerId,
}: SalesByPeriodReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => {
      setTriggerDownload(true);
    };

    window.addEventListener("download-sales-report", handleDownload);

    return () => {
      window.removeEventListener("download-sales-report", handleDownload);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSales = async () => {
      if (!companyId || !startDate) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let query = supabase
          .from("orders")
          .select(`
            id,
            note_number,
            appointment_date,
            due_date,
            customer,
            products,
            total,
            total_payed,
            payment_status,
            customer_id
          `)
          .eq("company_id", companyId)
          .gte("appointment_date", startDate)
          .order("appointment_date", { ascending: false });

        if (endDate) {
          query = query.lte("appointment_date", endDate);
        }

        if (customerId) {
          query = query.eq("customer_id", customerId);
        }

        const { data, error } = await query;

        if (cancelled) return;

        if (error) {
          console.error("Erro ao buscar relatório de vendas:", error);
          toast.error("Erro ao carregar relatório de vendas.");
          setRows([]);
          return;
        }

        const parsed: OrderRow[] = (data ?? []).map((item: any) => ({
          id: String(item.id),
          note_number: item.note_number ?? null,
          appointment_date: item.appointment_date ?? null,
          due_date: item.due_date ?? null,
          customer: item.customer ?? null,
          products: item.products ?? null,
          total: Number(item.total ?? 0),
          total_payed: Number(item.total_payed ?? 0),
          payment_status: item.payment_status ?? null,
        }));

        setRows(parsed);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Erro inesperado ao carregar relatório.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSales();

    return () => {
      cancelled = true;
    };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const summary = useMemo(() => {
    const totalSales = rows.reduce(
      (acc, row) => acc + Number(row.total ?? 0),
      0,
    );
    const totalPaid = rows.reduce(
      (acc, row) => acc + Number(row.total_payed ?? 0),
      0,
    );
    const totalOpen = rows.reduce((acc, row) => {
      const total = Number(row.total ?? 0);
      const paid = Number(row.total_payed ?? 0);
      const remaining = Math.max(total - paid, 0);
      return acc + remaining;
    }, 0);

    return {
      count: rows.length,
      totalSales,
      totalPaid,
      totalOpen,
    };
  }, [rows]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <SalesByPeriodPDF
                rows={rows}
                startDate={startDate}
                endDate={endDate}
                summary={summary}
              />
            }
            fileName={`relatorio-vendas-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total de vendas</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalSales)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.count} registro(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total recebido</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total em aberto</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalOpen)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Data</TableHead>
                  <TableHead className="min-w-[110px]">Vencimento</TableHead>
                  <TableHead className="min-w-[90px]">Nota</TableHead>
                  <TableHead className="min-w-[220px]">Cliente</TableHead>
                  <TableHead className="min-w-[260px]">Produtos</TableHead>
                  <TableHead className="min-w-[130px] text-right">
                    Total
                  </TableHead>
                  <TableHead className="min-w-[130px] text-right">
                    Pago
                  </TableHead>
                  <TableHead className="min-w-[130px] text-right">
                    Restante
                  </TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const total = Number(row.total ?? 0);
                    const paid = Number(row.total_payed ?? 0);
                    const remaining = Math.max(total - paid, 0);

                    return (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.appointment_date)}</TableCell>
                        <TableCell>{formatDate(row.due_date)}</TableCell>
                        <TableCell>{row.note_number ?? "—"}</TableCell>
                        <TableCell className="font-medium uppercase">
                          {row.customer || "—"}
                        </TableCell>
                        <TableCell className="max-w-[320px] whitespace-pre-wrap break-words uppercase">
                          {row.products || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(paid)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(row.payment_status)}>
                            {translatePaymentStatus(row.payment_status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma venda encontrada para os filtros informados.
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