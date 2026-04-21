"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OverdueReceivablesPDF } from "@/components/pdf/OverdueReceivablesPDF";
import { GenericReportPDF } from "@/components/pdf/GenericReportPDF";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

type ReportProps = {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
};

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    const d = date.includes("T") ? parseISO(date) : new Date(`${date}T12:00:00`);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

// --- 1. Contas a Receber Vencidas ---
export function OverdueReceivablesReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => {
      setTriggerDownload(true);
    };

    window.addEventListener("download-overdue-receivables-report", handleDownload);

    return () => {
      window.removeEventListener("download-overdue-receivables-report", handleDownload);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      const today = startOfDay(new Date()).toISOString().split("T")[0];
      try {
        let query = supabase
          .from("orders")
          .select("id, appointment_date, due_date, customer, note_number, total, total_payed")
          .eq("company_id", companyId)
          .neq("payment_status", "Paid")
          .lt("due_date", today)
          .order("due_date", { ascending: true });

        if (startDate) query = query.gte("appointment_date", startDate);
        if (endDate) query = query.lte("appointment_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;
        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar contas a receber.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, customerId, supabase]);

  if (loading) return <TableSkeleton />;

  const totalPending = rows.reduce((acc, r) => acc + (Number(r.total || 0) - Number(r.total_payed || 0)), 0);

  return (
    <Card className="border-red-200">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <OverdueReceivablesPDF
                rows={rows}
                startDate={startDate}
                endDate={endDate}
                summary={{
                  totalPending,
                  count: rows.length,
                }}
              />
            }
            fileName={`relatorio-contas-receber-vencidas-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
      <CardHeader className="bg-red-50/50">
        <CardTitle className="text-red-700">Contas a Receber Vencidas ⚠️</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => {
              const pending = Number(r.total || 0) - Number(r.total_payed || 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-red-600 font-bold">{formatDate(r.due_date)}</TableCell>
                  <TableCell className="font-medium uppercase">{r.customer}</TableCell>
                  <TableCell>{r.note_number || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(pending)}</TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma conta vencida encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 2. Recebimentos por Período ---
export function ReceiptsByPeriodReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-receipts-by-period-report", handleDownload);
    return () => window.removeEventListener("download-receipts-by-period-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("id, appointment_date, customer, payment_method, total_payed")
          .eq("company_id", companyId)
          .gt("total_payed", 0)
          .order("appointment_date", { ascending: false });

        if (startDate) query = query.gte("appointment_date", startDate);
        if (endDate) query = query.lte("appointment_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;
        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar recebimentos.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, customerId, supabase]);

  if (loading) return <TableSkeleton />;

  const totalReceipts = rows.reduce((acc, r) => acc + Number(r.total_payed), 0);

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Recebimentos por Período"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""}`}
                summary={[{ label: "Total Recebido", value: formatCurrency(totalReceipts) }]}
                columns={[
                  { label: "Data", key: "dateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer", width: "45%" },
                  { label: "Forma", key: "payment_method", width: "20%" },
                  { label: "Valor Pago", key: "valueFormatted", width: "20%", align: "right" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.appointment_date),
                  valueFormatted: formatCurrency(r.total_payed),
                }))}
              />
            }
            fileName={`recebimentos-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
      <Card>
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Total Recebido no Período</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceipts)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.appointment_date)}</TableCell>
                  <TableCell className="font-medium uppercase">{r.customer}</TableCell>
                  <TableCell>{r.payment_method || "—"}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">{formatCurrency(r.total_payed)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Nenhum recebimento no período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- 3. Inadimplência por Cliente ---
export function CustomerDefaultReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-customer-default-report", handleDownload);
    return () => window.removeEventListener("download-customer-default-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("customer, total, total_payed")
          .eq("company_id", companyId)
          .neq("payment_status", "Paid")
          .order("customer", { ascending: true });

        if (startDate) query = query.gte("appointment_date", startDate);
        if (endDate) query = query.lte("appointment_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data: results, error } = await query;
        if (error) throw error;

        const grouped: Record<string, { customer: string; unpaid: number }> = {};
        results?.forEach(r => {
          const key = r.customer;
          const unpaid = Number(r.total) - Number(r.total_payed);
          if (unpaid <= 0) return;
          if (!grouped[key]) grouped[key] = { customer: r.customer, unpaid: 0 };
          grouped[key].unpaid += unpaid;
        });

        setData(Object.values(grouped).sort((a, b) => b.unpaid - a.unpaid));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, customerId, supabase]);

  if (loading) return <TableSkeleton />;

  const totalUnpaid = data.reduce((acc, r) => acc + r.unpaid, 0);

  return (
    <Card>
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Inadimplência por Cliente"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy")}`}
                summary={[{ label: "Total em Aberto", value: formatCurrency(totalUnpaid) }]}
                columns={[
                  { label: "Cliente", key: "customer", width: "70%" },
                  { label: "Valor em Aberto", key: "valueFormatted", width: "30%", align: "right" },
                ]}
                data={data.map(r => ({
                  ...r,
                  valueFormatted: formatCurrency(r.unpaid),
                }))}
              />
            }
            fileName={`inadimplencia-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <CardHeader>
        <CardTitle>Maiores Inadimplentes (Saldo em Aberto)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor Total em Aberto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium uppercase">{r.customer}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{formatCurrency(r.unpaid)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">Parabéns! Sem inadimplência registrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 4. Vendas por Produto ---
export function SalesByProductReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("order_items")
          .select(`
            quantity,
            price,
            products (name, code),
            orders!inner (appointment_date, company_id, customer_id)
          `)
          .eq("orders.company_id", companyId);

        if (startDate) query = query.gte("orders.appointment_date", startDate);
        if (endDate) query = query.lte("orders.appointment_date", endDate);
        if (customerId) query = query.eq("orders.customer_id", customerId);

        const { data: items, error } = await query;
        if (error) throw error;

        const grouped: Record<string, { name: string; code: string; qty: number; total: number }> = {};
        items?.forEach((item: any) => {
          if (!item.products) return;
          const key = item.products.name;
          if (!grouped[key]) grouped[key] = { name: item.products.name, code: item.products.code, qty: 0, total: 0 };
          grouped[key].qty += item.quantity;
          grouped[key].total += (item.quantity * item.price);
        });

        setData(Object.values(grouped).sort((a, b) => b.total - a.total));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, customerId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por Produto (Analítico)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Qtd Vendida</TableHead>
              <TableHead className="text-right">Total Faturado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium uppercase">
                  {r.name} <span className="text-muted-foreground text-[10px]">({r.code})</span>
                </TableCell>
                <TableCell className="text-center">{r.qty}</TableCell>
                <TableCell className="text-right font-bold text-blue-600">{formatCurrency(r.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 5. Clientes que Mais Compram ---
export function TopCustomersReport({ companyId, startDate, endDate }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("customer, total")
          .eq("company_id", companyId);

        if (startDate) query = query.gte("appointment_date", startDate);
        if (endDate) query = query.lte("appointment_date", endDate);

        const { data: results, error } = await query;
        if (error) throw error;

        const grouped: Record<string, { name: string; total: number }> = {};
        results?.forEach(r => {
          const key = r.customer;
          if (!grouped[key]) grouped[key] = { name: r.customer, total: 0 };
          grouped[key].total += Number(r.total);
        });

        const sorted = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10);
        setData(sorted);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Clientes (Faturamento)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={150} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#1e40af" : "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 6. Extrato Completo por Cliente ---
export function CustomerFullStatementReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-customer-statement-report", handleDownload);
    return () => window.removeEventListener("download-customer-statement-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId || !customerId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [ordersRes, financialRes] = await Promise.all([
          supabase.from("orders").select("appointment_date, products, total, payment_status, total_payed").eq("company_id", companyId).eq("customer_id", customerId),
          supabase.from("financial_records").select("issue_date, description, amount, status, type").eq("company_id", companyId).eq("customer_id", customerId)
        ]);

        const combined = [
          ...(ordersRes.data || []).map(o => ({
            date: o.appointment_date,
            description: `Venda: ${o.products?.substring(0, 50)}...`,
            amount: o.total,
            status: o.payment_status,
            type: "Receita (Venda)"
          })),
          ...(financialRes.data || []).map(f => ({
            date: f.issue_date,
            description: f.description,
            amount: f.amount,
            status: f.status,
            type: f.type === "output" ? "Receita (Extra)" : "Despesa"
          }))
        ].sort((a, b) => b.date.localeCompare(a.date));

        setStatement(combined);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, customerId, supabase]);

  if (!customerId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Por favor, selecione um <strong>Cliente</strong> no filtro lateral para ver o extrato completo.
        </CardContent>
      </Card>
    );
  }

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extrato Consolidado do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statement.map((s, idx) => (
              <TableRow key={idx}>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.type}</TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">{s.description}</TableCell>
                <TableCell className={`text-right font-bold ${s.type.includes("Despesa") ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(s.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === "Paid" ? "default" : "outline"}>
                    {s.status === "Paid" ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 7. Vendas por Litragem (Inteligente) ---
export function SalesByVolumeReport({ companyId, startDate, endDate, customerId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [productSummary, setProductSummary] = useState<any[]>([]);
  const [totalLiters, setTotalLiters] = useState(0);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-sales-by-volume-report", handleDownload);
    return () => window.removeEventListener("download-sales-by-volume-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("order_items")
          .select(`
            id,
            quantity,
            products (name, code),
            orders!inner (id, appointment_date, company_id, customer_id)
          `)
          .eq("orders.company_id", companyId);

        if (startDate) query = query.gte("orders.appointment_date", startDate);
        if (endDate) query = query.lte("orders.appointment_date", endDate);
        if (customerId) query = query.eq("orders.customer_id", customerId);

        const { data: items, error } = await query;
        if (error) throw error;

        // Regex para extrair litragem (ex: 30LTS, 50 L, 1.5Lts)
        const volumeRegex = /(\d+(?:[.,]\d+)?)\s*(?:LTS|L|LITROS|Lts|Litros|lts|litros|l)\b/i;

        let grandTotal = 0;
        const dailyMap: Record<string, number> = {};
        const productMap: Record<string, { name: string; code: string; liters: number; count: number }> = {};

        items?.forEach((item: any) => {
          if (!item.products?.name) return;
          
          const match = item.products.name.match(volumeRegex);
          if (!match) return;

          // Normaliza o número (converte vírgula em ponto se necessário)
          const volumeStr = match[1].replace(",", ".");
          const volume = parseFloat(volumeStr);
          if (isNaN(volume)) return;

          const totalItemLiters = volume * (item.quantity || 0);
          grandTotal += totalItemLiters;

          // Agrupamento diário (Gráfico)
          const date = item.orders?.appointment_date || "—";
          dailyMap[date] = (dailyMap[date] || 0) + totalItemLiters;

          // Agrupamento por produto (Tabela)
          const pKey = item.products.name;
          if (!productMap[pKey]) {
            productMap[pKey] = { 
              name: item.products.name, 
              code: item.products.code, 
              liters: 0,
              count: 0
            };
          }
          productMap[pKey].liters += totalItemLiters;
          productMap[pKey].count += item.quantity;
        });

        // Formata dados para o gráfico
        const formattedChart = Object.entries(dailyMap)
          .map(([date, liters]) => ({ date, liters }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Formata dados para a tabela
        const formattedProducts = Object.values(productMap)
          .sort((a, b) => b.liters - a.liters);

        setTotalLiters(grandTotal);
        setChartData(formattedChart);
        setProductSummary(formattedProducts);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao processar relatório de litragem.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, startDate, endDate, customerId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Vendas por Litragem"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""}`}
                summary={[{ label: "Volume Total", value: `${totalLiters.toLocaleString("pt-BR")} L` }]}
                columns={[
                  { label: "Produto", key: "name", width: "60%" },
                  { label: "Qtd Itens", key: "count", width: "20%", align: "center" },
                  { label: "Total Litragem", key: "valueFormatted", width: "20%", align: "right" },
                ]}
                data={productSummary.map(p => ({
                  ...p,
                  valueFormatted: `${p.liters.toLocaleString("pt-BR")} L`,
                }))}
              />
            }
            fileName={`vendas-litragem-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
        <Card className="md:col-span-1">
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Volume Total Vendido</p>
            <p className="text-3xl font-bold text-blue-600">
              {totalLiters.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">Litros</span>
            </p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Evolução de Venda por Litragem</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Bar dataKey="liters" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Tooltip 
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(val: number) => [`${val.toLocaleString("pt-BR")} L`, "Volume"]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Litragem por Produto</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd Itens</TableHead>
                <TableHead className="text-right">Total Litragem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSummary.length > 0 ? productSummary.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium uppercase">
                    {p.name} <span className="text-muted-foreground text-[10px]">({p.code})</span>
                  </TableCell>
                  <TableCell className="text-center">{p.count}</TableCell>
                  <TableCell className="text-right font-bold text-blue-700">
                    {p.liters.toLocaleString("pt-BR")} L
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    Nenhum produto com litragem identificada no nome.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
