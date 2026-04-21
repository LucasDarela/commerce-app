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

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

type InvoiceRow = {
  id: string;
  numero: string | null;
  serie: string | null;
  customer_name: string | null;
  natureza_operacao: string | null;
  status: string | null;
  valor_total: number | null;
  data_emissao: string | null;
  created_at: string | null;
  danfe_url: string | null;
  xml_url: string | null;
  ref: string | null;
  order_id: string | null;
};

interface BaseProps {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    const d = date.includes("T") ? new Date(date) : new Date(`${date}T12:00:00`);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: string | null) {
  switch (status) {
    case "autorizado": return "Autorizado";
    case "cancelado": return "Cancelado";
    case "inutilizado": return "Inutilizado";
    case "processando_autorizacao": return "Processando";
    case "erro_autorizacao": return "Erro";
    default: return status ?? "—";
  }
}

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "autorizado": return "default";
    case "cancelado": return "secondary";
    case "erro_autorizacao": return "destructive";
    default: return "outline";
  }
}

async function fetchInvoices(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  companyId: string,
  startDate: string,
  endDate?: string,
  customerId?: string,
  statusFilter?: string[]
) {
  let query = supabase
    .from("invoices")
    .select(
      "id, numero, serie, customer_name, natureza_operacao, status, valor_total, data_emissao, created_at, danfe_url, xml_url, ref, order_id"
    )
    .eq("company_id", companyId)
    .gte("created_at", `${startDate}T00:00:00`)
    .order("created_at", { ascending: false });

  if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);
  if (statusFilter?.length) query = query.in("status", statusFilter);

  const { data, error } = await query;
  if (error) { console.error("Erro ao buscar invoices:", error); return []; }
  return (data ?? []) as InvoiceRow[];
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
        Nenhum registro encontrado para os filtros informados.
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────
// 1. NF-e Emitidas por Período
// ─────────────────────────────────────────────

export function InvoicesByPeriodReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-invoices-by-period-report", handleDownload);
    return () => window.removeEventListener("download-invoices-by-period-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate).then((data) => {
      if (!cancelled) { setRows(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  const total = rows.reduce((s, r) => s + (r.valor_total ?? 0), 0);
  const autorizadas = rows.filter((r) => r.status === "autorizado").length;

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="NF-e Emitidas por Período"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""}`}
                summary={[
                  { label: "Total Emitidas", value: String(rows.length) },
                  { label: "Autorizadas", value: String(autorizadas) },
                  { label: "Valor Total", value: formatCurrency(total) },
                ]}
                columns={[
                  { label: "Nº", key: "numero", width: "10%" },
                  { label: "Emissão", key: "dateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer_name", width: "35%" },
                  { label: "Natureza", key: "natureza_operacao", width: "20%" },
                  { label: "Valor", key: "valueFormatted", width: "10%", align: "right" },
                  { label: "Status", key: "statusLabel", width: "10%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.data_emissao ?? r.created_at),
                  valueFormatted: formatCurrency(r.valor_total),
                  statusLabel: statusLabel(r.status),
                }))}
              />
            }
            fileName={`nfe-emitidas-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Emitidas", value: String(rows.length) },
          { label: "Autorizadas", value: String(autorizadas) },
          { label: "Canceladas", value: String(rows.filter((r) => r.status === "cancelado").length) },
          { label: "Valor Total", value: formatCurrency(total) },
        ].map((c) => (
          <Card key={c.label}><CardContent className="py-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.numero ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.data_emissao ?? r.created_at)}</TableCell>
                  <TableCell className="uppercase">{r.customer_name ?? "—"}</TableCell>
                  <TableCell>{r.natureza_operacao ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.valor_total)}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></TableCell>
                </TableRow>
              )) : <EmptyRow cols={6} />}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. NF-e Autorizadas / Rejeitadas
// ─────────────────────────────────────────────

export function InvoicesStatusReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-invoice-status-report", handleDownload);
    return () => window.removeEventListener("download-invoice-status-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate).then((data) => {
      if (!cancelled) { setRows(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  const groups = useMemo(() => {
    const map: Record<string, InvoiceRow[]> = {};
    for (const r of rows) {
      const key = r.status ?? "desconhecido";
      (map[key] ||= []).push(r);
    }
    return map;
  }, [rows]);

  const autorizado = groups["autorizado"] ?? [];
  const erro = groups["erro_autorizacao"] ?? [];
  const cancelado = groups["cancelado"] ?? [];
  const outros = rows.filter((r) => !["autorizado","erro_autorizacao","cancelado"].includes(r.status ?? ""));

  if (loading) return <TableSkeleton />;

  const Section = ({ title, items, variant }: { title: string; items: InvoiceRow[]; variant: "default" | "destructive" | "secondary" | "outline" }) => (
    <Card>
      <CardContent className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <p className="font-semibold text-sm">{title}</p>
          <Badge variant={variant}>{items.length} nota(s)</Badge>
        </div>
        <div className="overflow-x-auto px-6 pb-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.length > 0 ? items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.numero ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.data_emissao ?? r.created_at)}</TableCell>
                  <TableCell className="uppercase">{r.customer_name ?? "—"}</TableCell>
                  <TableCell>{r.natureza_operacao ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.valor_total)}</TableCell>
                </TableRow>
              )) : <EmptyRow cols={5} />}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Status de NF-e"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[
                  { label: "Autorizadas", value: String(autorizado.length) },
                  { label: "Erro / Rejeitadas", value: String(erro.length) },
                  { label: "Canceladas", value: String(cancelado.length) },
                ]}
                columns={[
                  { label: "Nº", key: "numero", width: "10%" },
                  { label: "Emissão", key: "dateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer_name", width: "35%" },
                  { label: "Natureza", key: "natureza_operacao", width: "20%" },
                  { label: "Valor", key: "valueFormatted", width: "10%", align: "right" },
                  { label: "Status", key: "statusLabel", width: "10%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.data_emissao ?? r.created_at),
                  valueFormatted: formatCurrency(r.valor_total),
                  statusLabel: statusLabel(r.status),
                }))}
              />
            }
            fileName={`status-nfe-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Autorizadas", value: autorizado.length, color: "text-green-600" },
          { label: "Erro / Rejeitadas", value: erro.length, color: "text-destructive" },
          { label: "Canceladas", value: cancelado.length, color: "text-muted-foreground" },
        ].map((c) => (
          <Card key={c.label}><CardContent className="py-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <Section title="✓ Autorizadas" items={autorizado} variant="default" />
      <Section title="✕ Erro / Rejeitadas" items={erro} variant="destructive" />
      {cancelado.length > 0 && <Section title="Canceladas" items={cancelado} variant="secondary" />}
      {outros.length > 0 && <Section title="Outros Status" items={outros} variant="outline" />}
    </div>
  );
}

// ─────────────────────────────────────────────
// 3. NF-e por Cliente
// ─────────────────────────────────────────────

export function InvoicesByCustomerReport({ companyId, startDate, endDate, customerId }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-invoices-by-customer-report", handleDownload);
    return () => window.removeEventListener("download-invoices-by-customer-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate).then((data) => {
      const filtered = customerId ? data.filter((r: InvoiceRow) => r.order_id === customerId) : data;
      if (!cancelled) { setRows(filtered); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const groups = useMemo(() => {
    const map = new Map<string, InvoiceRow[]>();
    for (const r of rows) {
      const key = r.customer_name ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="NF-e por Cliente"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[
                  { label: "Clientes com NF-e", value: String(groups.length) },
                  { label: "Total de Notas", value: String(rows.length) },
                  { label: "Valor Total", value: formatCurrency(rows.reduce((s, r) => s + (r.valor_total ?? 0), 0)) },
                ]}
                columns={[
                  { label: "Cliente", key: "customer_name", width: "35%" },
                  { label: "Nº", key: "numero", width: "10%" },
                  { label: "Emissão", key: "dateFormatted", width: "15%" },
                  { label: "Natureza", key: "natureza_operacao", width: "20%" },
                  { label: "Valor", key: "valueFormatted", width: "10%", align: "right" },
                  { label: "Status", key: "statusLabel", width: "10%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.data_emissao ?? r.created_at),
                  valueFormatted: formatCurrency(r.valor_total),
                  statusLabel: statusLabel(r.status),
                }))}
              />
            }
            fileName={`nfe-por-cliente-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Clientes com NF-e</p>
          <p className="text-2xl font-bold">{groups.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Total de Notas</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold">{formatCurrency(rows.reduce((s, r) => s + (r.valor_total ?? 0), 0))}</p>
        </CardContent></Card>
      </div>

      {groups.map(([customer, invoices]) => (
        <Card key={customer}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <p className="font-semibold uppercase">{customer}</p>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline">{invoices.length} nota(s)</Badge>
                <Badge variant="secondary">{formatCurrency(invoices.reduce((s, r) => s + (r.valor_total ?? 0), 0))}</Badge>
              </div>
            </div>
            <div className="overflow-x-auto px-6 pb-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.numero ?? "—"}</TableCell>
                      <TableCell>{formatDate(r.data_emissao ?? r.created_at)}</TableCell>
                      <TableCell>{r.natureza_operacao ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.valor_total)}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
      {groups.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma nota encontrada para os filtros informados.
        </CardContent></Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 4. Resumo Fiscal por Natureza de Operação
// ─────────────────────────────────────────────

export function FiscalOperationSummaryReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-fiscal-operation-summary-report", handleDownload);
    return () => window.removeEventListener("download-fiscal-operation-summary-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate, undefined, ["autorizado"]).then((data) => {
      if (!cancelled) { setRows(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  const groups = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of rows) {
      const key = r.natureza_operacao ?? "Não informado";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      map.set(key, { count: cur.count + 1, total: cur.total + (r.valor_total ?? 0) });
    }
    return Array.from(map.entries())
      .map(([natureza, stats]) => ({ natureza, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Resumo Fiscal por Natureza de Operação"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[
                  { label: "Operações distintas", value: String(groups.length) },
                  { label: "Valor Total Autorizado", value: formatCurrency(rows.reduce((s, r) => s + (r.valor_total ?? 0), 0)) },
                ]}
                columns={[
                  { label: "Natureza da Operação", key: "natureza", width: "50%" },
                  { label: "Qtd. Notas", key: "count", width: "15%", align: "center" },
                  { label: "Valor Total", key: "totalFormatted", width: "20%", align: "right" },
                  { label: "%", key: "pct", width: "15%", align: "right" },
                ]}
                data={(() => {
                  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
                  return groups.map(g => ({
                    ...g,
                    totalFormatted: formatCurrency(g.total),
                    pct: grandTotal > 0 ? ((g.total / grandTotal) * 100).toFixed(1) + "%" : "—",
                  }));
                })()}
              />
            }
            fileName={`resumo-fiscal-operacao-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Operações distintas</p>
          <p className="text-2xl font-bold">{groups.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Valor Total Autorizado</p>
          <p className="text-2xl font-bold">{formatCurrency(rows.reduce((s, r) => s + (r.valor_total ?? 0), 0))}</p>
        </CardContent></Card>
      </div>
      <Card><CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Natureza da Operação</TableHead>
              <TableHead className="text-center">Qtd. Notas</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {groups.length > 0 ? (() => {
                const grandTotal = groups.reduce((s, g) => s + g.total, 0);
                return groups.map((g) => (
                  <TableRow key={g.natureza}>
                    <TableCell className="font-medium">{g.natureza}</TableCell>
                    <TableCell className="text-center">{g.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(g.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {grandTotal > 0 ? ((g.total / grandTotal) * 100).toFixed(1) + "%" : "—"}
                    </TableCell>
                  </TableRow>
                ));
              })() : <EmptyRow cols={4} />}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// 5. Notas Pendentes de Emissão
// ─────────────────────────────────────────────

export function PendingInvoicesReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-pending-invoice-issuance-report", handleDownload);
    return () => window.removeEventListener("download-pending-invoice-issuance-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate, undefined, [
      "processando_autorizacao",
      "erro_autorizacao",
    ]).then((data) => {
      if (!cancelled) { setRows(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  const processando = rows.filter((r) => r.status === "processando_autorizacao");
  const erro = rows.filter((r) => r.status === "erro_autorizacao");

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Notas Pendentes de Emissão"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[
                  { label: "Processando", value: String(processando.length) },
                  { label: "Com Erro", value: String(erro.length) },
                ]}
                columns={[
                  { label: "Ref / Nº", key: "refOrNumero", width: "20%" },
                  { label: "Criada em", key: "dateFormatted", width: "20%" },
                  { label: "Cliente", key: "customer_name", width: "30%" },
                  { label: "Valor", key: "valueFormatted", width: "15%", align: "right" },
                  { label: "Status", key: "statusLabel", width: "15%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  refOrNumero: r.numero ?? r.ref,
                  dateFormatted: formatDate(r.created_at),
                  valueFormatted: formatCurrency(r.valor_total),
                  statusLabel: statusLabel(r.status),
                }))}
              />
            }
            fileName={`notas-pendentes-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Processando</p>
          <p className="text-2xl font-bold text-amber-500">{processando.length}</p>
          <p className="text-xs text-muted-foreground mt-1">aguardando SEFAZ</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Com Erro</p>
          <p className="text-2xl font-bold text-destructive">{erro.length}</p>
          <p className="text-xs text-muted-foreground mt-1">necessitam ação</p>
        </CardContent></Card>
      </div>
      <Card><CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº / Ref</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.numero ?? r.ref ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                  <TableCell className="uppercase">{r.customer_name ?? "—"}</TableCell>
                  <TableCell>{r.natureza_operacao ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.valor_total)}</TableCell>
                  <TableCell><Badge variant={r.status === "erro_autorizacao" ? "destructive" : "outline"}>
                    {statusLabel(r.status)}
                  </Badge></TableCell>
                </TableRow>
              )) : <EmptyRow cols={6} />}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// 6. Divergências Fiscais de Produtos
// (notas autorizadas cujo danfe_url ou xml_url estão ausentes)
// ─────────────────────────────────────────────

export function FiscalFieldIssuesReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<(InvoiceRow & { issues: string[] })[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-fiscal-field-issues-report", handleDownload);
    return () => window.removeEventListener("download-fiscal-field-issues-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices(supabase, companyId, startDate, endDate).then((data) => {
      const withIssues = data
        .map((r) => {
          const issues: string[] = [];
          if (!r.customer_name) issues.push("Sem cliente");
          if (!r.natureza_operacao) issues.push("Sem natureza de operação");
          if (!r.valor_total) issues.push("Valor zerado");
          if (r.status === "autorizado" && !r.danfe_url) issues.push("DANFE não vinculado");
          if (r.status === "autorizado" && !r.xml_url) issues.push("XML não vinculado");
          if (r.status === "autorizado" && !r.data_emissao) issues.push("Data de emissão ausente");
          return { ...r, issues };
        })
        .filter((r) => r.issues.length > 0);
      if (!cancelled) { setRows(withIssues); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Divergências Fiscais encontradas"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[{ label: "Total Divergências", value: String(rows.length) }]}
                columns={[
                  { label: "Nº", key: "numero", width: "10%" },
                  { label: "Emissão", key: "dateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer_name", width: "30%" },
                  { label: "Status", key: "statusLabel", width: "15%" },
                  { label: "Divergências", key: "issuesLabel", width: "30%" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.data_emissao ?? r.created_at),
                  statusLabel: statusLabel(r.status),
                  issuesLabel: r.issues.join(", "),
                }))}
              />
            }
            fileName={`divergencias-fiscais-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <Card><CardContent className="py-5">
        <p className="text-sm text-muted-foreground">Notas com divergências encontradas</p>
        <p className="text-2xl font-bold text-destructive">{rows.length}</p>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Divergências</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.numero ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.data_emissao ?? r.created_at)}</TableCell>
                  <TableCell className="uppercase">{r.customer_name ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.issues.map((issue) => (
                        <Badge key={issue} variant="destructive" className="text-xs font-normal">{issue}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhuma divergência encontrada. ✓
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
