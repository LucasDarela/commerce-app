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
import { SalesGroupedByCustomerPDF } from "@/components/pdf/SalesGroupedByCustomerPDF";

type SalesGroupedByCustomerReportProps = {
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
  total: number;
  total_payed: number;
  payment_status: string | null;
};

type CustomerGroup = {
  customer: string;
  rows: OrderRow[];
  totalNotes: number;
  totalOverdue: number;
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

function isOverdue(dueDate: string | null, paymentStatus: string | null) {
  if (!dueDate) return false;
  if (paymentStatus === "Paid") return false;

  const today = new Date();
  const due = new Date(`${dueDate}T23:59:59`);

  return due < today;
}

export function SalesGroupedByCustomerReport({
  companyId,
  startDate,
  endDate,
  customerId,
}: SalesGroupedByCustomerReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

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
          .order("customer", { ascending: true })
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
          console.error("Erro ao buscar relatório agrupado:", error);
          toast.error("Erro ao carregar relatório agrupado.");
          setRows([]);
          return;
        }

        const parsed: OrderRow[] = (data ?? []).map((item: any) => ({
          id: String(item.id),
          note_number: item.note_number ?? null,
          appointment_date: item.appointment_date ?? null,
          due_date: item.due_date ?? null,
          customer: item.customer ?? "SEM CLIENTE",
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

  const grouped = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, OrderRow[]>();

    for (const row of rows) {
      const customerName = row.customer || "SEM CLIENTE";
      if (!map.has(customerName)) {
        map.set(customerName, []);
      }
      map.get(customerName)!.push(row);
    }

    return Array.from(map.entries()).map(([customer, customerRows]) => {
      const totalNotes = customerRows.reduce((acc, row) => acc + row.total, 0);

      const totalOverdue = customerRows.reduce((acc, row) => {
        const remaining = Math.max(row.total - row.total_payed, 0);
        return isOverdue(row.due_date, row.payment_status)
          ? acc + remaining
          : acc;
      }, 0);

      return {
        customer,
        rows: customerRows,
        totalNotes,
        totalOverdue,
      };
    });
  }, [rows]);

  const summary = useMemo(() => {
    const totalSales = rows.reduce((acc, row) => acc + row.total, 0);
    const totalPaid = rows.reduce((acc, row) => acc + row.total_payed, 0);
    const totalOpen = rows.reduce(
      (acc, row) => acc + Math.max(row.total - row.total_payed, 0),
      0,
    );

    return {
      customers: grouped.length,
      notes: rows.length,
      totalSales,
      totalPaid,
      totalOpen,
    };
  }, [rows, grouped]);

  useEffect(() => {
    const handleDownload = () => {
      setTriggerDownload(true);
    };

    window.addEventListener("download-sales-grouped-report", handleDownload);

    return () => {
      window.removeEventListener(
        "download-sales-grouped-report",
        handleDownload,
      );
    };
  }, []);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <SalesGroupedByCustomerPDF
                groups={grouped}
                startDate={startDate}
                endDate={endDate}
                summary={summary}
              />
            }
            fileName={`relatorio-vendas-agrupadas-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Clientes</p>
            <p className="text-2xl font-bold">{summary.customers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Notas</p>
            <p className="text-2xl font-bold">{summary.notes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total das notas</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalSales)}
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

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum registro encontrado para os filtros informados.
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.customer}>
            <CardContent className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold uppercase">
                      {group.customer}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.rows.length} nota(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Total das notas:{" "}
                      </span>
                      <strong>{formatCurrency(group.totalNotes)}</strong>
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Total vencido:{" "}
                      </span>
                      <strong>{formatCurrency(group.totalOverdue)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[110px]">Data</TableHead>
                      <TableHead className="min-w-[110px]">Vencimento</TableHead>
                      <TableHead className="min-w-[90px]">Nota</TableHead>
                      <TableHead className="min-w-[260px]">Produtos</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[130px] text-right">
                        Pago
                      </TableHead>
                      <TableHead className="min-w-[130px] text-right">
                        Restante
                      </TableHead>
                      <TableHead className="min-w-[130px] text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {group.rows.map((row) => {
                      const remaining = Math.max(
                        Number(row.total) - Number(row.total_payed),
                        0,
                      );

                      return (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.appointment_date)}</TableCell>
                          <TableCell>{formatDate(row.due_date)}</TableCell>
                          <TableCell>{row.note_number ?? "—"}</TableCell>
                          <TableCell className="max-w-[320px] whitespace-pre-wrap break-words uppercase">
                            {row.products || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(row.payment_status)}>
                              {translatePaymentStatus(row.payment_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.total_payed)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={4} className="font-semibold">
                        Totais do cliente
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(group.totalOverdue)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(group.totalNotes)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}