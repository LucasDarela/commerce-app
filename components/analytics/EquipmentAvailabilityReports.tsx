"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GenericReportPDF } from "@/components/pdf/GenericReportPDF";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

interface BaseProps {
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

// ─────────────────────────────────────────────
// 1. Equipamentos Não Retornados
//    Comodatos em aberto (sem data de recolha)
// ─────────────────────────────────────────────

type UnreturnedLoan = {
  id: string;
  loan_date: string;
  days_out: number;
  customer_name: string | null;
  equipmentName: string;
  quantity: number;
  note_number: string | null;
};

export function UnreturnedEquipmentsReport({ companyId, startDate, endDate, customerId }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UnreturnedLoan[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-unreturned-equipments-report", handleDownload);
    return () => window.removeEventListener("download-unreturned-equipments-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !startDate) { setLoading(false); return; }
    setLoading(true);

    const run = async () => {
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
            equipments(name),
            equipment_loan_returns(id)
          `)
          .eq("company_id", companyId)
          .gte("loan_date", startDate)
          .is("return_date", null)
          .order("loan_date", { ascending: true });

        if (endDate) query = query.lte("loan_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;
        if (error || cancelled) { if (!cancelled) setRows([]); return; }

        const today = new Date();

        const parsed: UnreturnedLoan[] = (data ?? [])
          .filter((r: any) => !(r.equipment_loan_returns?.length > 0))
          .map((r: any) => {
            const loanDate = new Date(`${r.loan_date}T12:00:00`);
            const days = Math.floor((today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: r.id,
              loan_date: r.loan_date,
              days_out: days,
              customer_name: r.customer_name ?? "—",
              equipmentName: r.equipments?.name ?? "—",
              quantity: r.quantity ?? 0,
              note_number: r.note_number ?? null,
            };
          })
          .sort((a: UnreturnedLoan, b: UnreturnedLoan) => b.days_out - a.days_out);

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

  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
  const avgDays = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.days_out, 0) / rows.length)
    : 0;
  const maxDays = rows.length > 0 ? Math.max(...rows.map((r) => r.days_out)) : 0;

  function daysVariant(days: number): "default" | "secondary" | "destructive" | "outline" {
    if (days > 90) return "destructive";
    if (days > 30) return "secondary";
    return "outline";
  }

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Equipamentos Não Retornados (Em Aberto)"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""}`}
                summary={[
                  { label: "Comodatos em Aberto", value: String(rows.length) },
                  { label: "Unidades Não Retornadas", value: String(totalUnits) },
                  { label: "Média de Dias Fora", value: `${avgDays} dias` },
                ]}
                columns={[
                  { label: "Data Entrega", key: "dateFormatted", width: "15%" },
                  { label: "Cliente", key: "customer_name", width: "30%" },
                  { label: "Equipamento", key: "equipmentName", width: "30%" },
                  { label: "Qtd", key: "quantity", width: "10%", align: "center" },
                  { label: "Dias", key: "days_out", width: "15%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.loan_date),
                }))}
              />
            }
            fileName={`equipamentos-pendentes-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
          { label: "Comodatos em Aberto", value: String(rows.length) },
          { label: "Unidades Não Retornadas", value: String(totalUnits) },
          { label: "Média de Dias Fora", value: `${avgDays} dias` },
          { label: "Maior Tempo Fora", value: `${maxDays} dias` },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Data Entrega</TableHead>
                  <TableHead className="min-w-[180px]">Cliente</TableHead>
                  <TableHead className="min-w-[180px]">Equipamento</TableHead>
                  <TableHead className="min-w-[70px] text-center">Qtd.</TableHead>
                  <TableHead className="min-w-[100px] text-center">Dias Fora</TableHead>
                  <TableHead className="min-w-[90px]">Nota</TableHead>
                  <TableHead>Urgência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.loan_date)}</TableCell>
                    <TableCell className="uppercase font-medium">{row.customer_name}</TableCell>
                    <TableCell>{row.equipmentName}</TableCell>
                    <TableCell className="text-center">{row.quantity}</TableCell>
                    <TableCell className="text-center font-semibold">{row.days_out}</TableCell>
                    <TableCell>{row.note_number ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={daysVariant(row.days_out)}>
                        {row.days_out > 90 ? "Crítico" : row.days_out > 30 ? "Atenção" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Nenhum equipamento pendente de retorno no período.
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

// ─────────────────────────────────────────────
// 2. Equipamentos Disponíveis x Emprestados
//    Mostra estoque e quantos estão em comodato
// ─────────────────────────────────────────────

type EquipmentStock = {
  id: string;
  name: string;
  stock: number | null;
  status: string | null;
  is_available: boolean | null;
  loaned: number;
  available: number;
};

export function AvailableVsLoanedEquipmentsReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EquipmentStock[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-available-vs-loaned-equipments-report", handleDownload);
    return () => window.removeEventListener("download-available-vs-loaned-equipments-report", handleDownload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) { setLoading(false); return; }
    setLoading(true);

    const run = async () => {
      try {
        // Busca todos os equipamentos da empresa
        const { data: equipData, error: equipErr } = await supabase
          .from("equipments")
          .select("id, name, stock, status, is_available")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (equipErr || cancelled) { if (!cancelled) setRows([]); return; }

        // Busca comodatos não retornados para calcular quantos estão emprestados
        const { data: loanData } = await supabase
          .from("equipment_loans")
          .select("equipment_id, quantity, return_date, equipment_loan_returns(id)")
          .eq("company_id", companyId)
          .is("return_date", null);

        if (cancelled) return;

        // Calcula quantidade emprestada por equipamento
        const loanedMap = new Map<string, number>();
        for (const loan of (loanData ?? []) as any[]) {
          const hasReturn = (loan.equipment_loan_returns ?? []).length > 0;
          if (!hasReturn && loan.equipment_id) {
            const cur = loanedMap.get(loan.equipment_id) ?? 0;
            loanedMap.set(loan.equipment_id, cur + (loan.quantity ?? 0));
          }
        }

        const parsed: EquipmentStock[] = (equipData ?? []).map((e: any) => {
          const loaned = loanedMap.get(e.id) ?? 0;
          const stock = e.stock ?? 0;
          const available = Math.max(stock - loaned, 0);
          return {
            id: e.id,
            name: e.name,
            stock,
            status: e.status,
            is_available: e.is_available,
            loaned,
            available,
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
  }, [companyId, startDate, endDate, supabase]);

  const totalStock = rows.reduce((s, r) => s + (r.stock ?? 0), 0);
  const totalLoaned = rows.reduce((s, r) => s + r.loaned, 0);
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
  const loanedPct = totalStock > 0 ? Math.round((totalLoaned / totalStock) * 100) : 0;

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Disponibilidade x Comodato de Equipamentos"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                summary={[
                  { label: "Estoque Total", value: String(totalStock) },
                  { label: "Em Comodato", value: String(totalLoaned) },
                  { label: "Disponíveis", value: String(totalAvailable) },
                ]}
                columns={[
                  { label: "Equipamento", key: "name", width: "40%" },
                  { label: "Estoque", key: "stock", width: "15%", align: "center" },
                  { label: "Comodato", key: "loaned", width: "15%", align: "center" },
                  { label: "Disponível", key: "available", width: "15%", align: "center" },
                  { label: "Uso %", key: "pctLabel", width: "15%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  pctLabel: (r.stock ?? 0) > 0 ? `${Math.round((r.loaned / (r.stock ?? 1)) * 100)}%` : "0%",
                }))}
              />
            }
            fileName={`disponibilidade-equipamentos-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tipos de Equipamento", value: String(rows.length) },
          { label: "Estoque Total", value: String(totalStock) },
          { label: "Em Comodato", value: String(totalLoaned) },
          { label: "Disponíveis", value: String(totalAvailable) },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra geral */}
      <Card>
        <CardContent className="py-5 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Utilização geral do estoque</span>
            <span className="font-medium text-foreground">{loanedPct}% emprestado</span>
          </div>
          <Progress value={loanedPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabela por equipamento */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Equipamento</TableHead>
                  <TableHead className="text-center min-w-[90px]">Estoque</TableHead>
                  <TableHead className="text-center min-w-[110px]">Em Comodato</TableHead>
                  <TableHead className="text-center min-w-[110px]">Disponíveis</TableHead>
                  <TableHead className="min-w-[160px]">Utilização</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? rows.map((row) => {
                  const pct = (row.stock ?? 0) > 0
                    ? Math.round((row.loaned / (row.stock ?? 1)) * 100)
                    : 0;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-center">{row.stock ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <span className={row.loaned > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                          {row.loaned}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={row.available === 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                          {row.available}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24"><ProgressBar value={pct} /></div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.available === 0 ? "destructive" : row.loaned > 0 ? "secondary" : "outline"}>
                          {row.available === 0 ? "Esgotado" : row.loaned > 0 ? "Parcial" : "Disponível"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum equipamento cadastrado encontrado.
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
