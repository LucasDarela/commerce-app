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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GenericReportPDF } from "@/components/pdf/GenericReportPDF";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type ReportProps = {
  companyId: string;
  startDate?: string;
  endDate?: string;
};

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    const d = date.includes("T") ? parseISO(date) : new Date(`${date}T12:00:00`);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

// --- 7. Equipamentos Não Retornados ---
export function EquipmentNotReturnedReport({ companyId, startDate, endDate }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-unreturned-equipments-report", handleDownload);
    return () => window.removeEventListener("download-unreturned-equipments-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("equipment_loans")
          .select(`
            id,
            loan_date,
            customer_name,
            quantity,
            note_number,
            equipments (name),
            equipment_loan_returns (returned_quantity)
          `)
          .eq("company_id", companyId)
          .is("return_date", null) // Ou baseado no histórico de retorno
          .order("loan_date", { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        const filtered = (data || []).filter((r: any) => {
          const returned = r.equipment_loan_returns?.reduce((acc: number, ret: any) => acc + (ret.returned_quantity || 0), 0) || 0;
          return (r.quantity || 0) > returned;
        });

        setRows(filtered);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar comodatos pendentes.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card className="border-amber-200">
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Equipamentos Não Retornados (Em Posse)"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy")}`}
                columns={[
                  { label: "Data Entrega", key: "dateFormatted", width: "20%" },
                  { label: "Cliente", key: "customer_name", width: "40%" },
                  { label: "Equipamento", key: "equipmentLabel", width: "30%" },
                  { label: "Qtd", key: "quantity", width: "10%", align: "center" },
                ]}
                data={rows.map(r => ({
                  ...r,
                  dateFormatted: formatDate(r.loan_date),
                  equipmentLabel: r.equipments?.name,
                }))}
              />
            }
            fileName={`equipamentos-pendentes-${format(new Date(), "yyyy-MM-dd")}.pdf`}
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
      <CardHeader className="bg-amber-50/50">
        <CardTitle className="text-amber-700">Equipamentos em Posse de Clientes (Não Retornados)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Empréstimo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead className="text-center">Qtd</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.loan_date)}</TableCell>
                <TableCell className="font-medium uppercase">{r.customer_name}</TableCell>
                <TableCell className="uppercase">{r.equipments?.name}</TableCell>
                <TableCell className="text-center font-bold text-amber-600">{r.quantity}</TableCell>
                <TableCell>{r.note_number || "—"}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Todos os equipamentos foram retornados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 8. Equipamentos Disponíveis x Emprestados ---
export function EquipmentAvailableVsLoanedReport({ companyId }: ReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-available-vs-loaned-equipments-report", handleDownload);
    return () => window.removeEventListener("download-available-vs-loaned-equipments-report", handleDownload);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        const [equipRes, loansRes] = await Promise.all([
          supabase.from("equipments").select("stock").eq("company_id", companyId),
          supabase.from("equipment_loans").select("quantity, equipment_loan_returns(returned_quantity)").eq("company_id", companyId)
        ]);

        const totalStock = equipRes.data?.reduce((acc, e) => acc + (e.stock || 0), 0) || 0;
        const totalLoaned = loansRes.data?.reduce((acc, l: any) => {
          const returned = l.equipment_loan_returns?.reduce((s: number, r: any) => s + (r.returned_quantity || 0), 0) || 0;
          return acc + (Number(l.quantity || 0) - returned);
        }, 0) || 0;

        const available = Math.max(0, totalStock - totalLoaned);

        setData([
          { name: "Disponível", value: available, color: "#22c55e" },
          { name: "Emprestado (Em uso)", value: totalLoaned, color: "#f59e0b" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Equipamentos Disponíveis x Emprestados"
                subtitle={`Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`}
                columns={[
                  { label: "Indicador", key: "name", width: "70%" },
                  { label: "Valor (Unidades)", key: "value", width: "30%", align: "right" },
                ]}
                data={data}
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
      <CardHeader>
        <CardTitle>Equipamentos Disponíveis x Emprestados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} unidades`, ""]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            {data.map(d => (
                <div key={d.name}>
                    <p className="text-xs text-muted-foreground uppercase">{d.name}</p>
                    <p className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</p>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
