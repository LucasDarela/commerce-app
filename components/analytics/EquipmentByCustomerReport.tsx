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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GenericReportPDF } from "@/components/pdf/GenericReportPDF";

interface Props {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
}

type LoanRecord = {
  id: string;
  loan_date: string;
  return_date: string | null;
  customer_name: string;
  equipment_name: string;
  quantity: number;
  note_number: string | null;
  status: string | null;
  returned_qty: number | null;
  remaining_qty: number | null;
  actual_return_date: string | null;
};

type CustomerGroup = {
  customer_name: string;
  loans: LoanRecord[];
  total_items: number;
  pending: number;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return format(new Date(`${date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

export function EquipmentByCustomerReport({ companyId, startDate, endDate, customerId }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [filterPending, setFilterPending] = useState(false);
  const [triggerDownload, setTriggerDownload] = useState(false);

  useEffect(() => {
    const handleDownload = () => setTriggerDownload(true);
    window.addEventListener("download-equipment-by-customer-report", handleDownload);
    return () => window.removeEventListener("download-equipment-by-customer-report", handleDownload);
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
            returned_quantity,
            note_number,
            status,
            equipments(name)
          `)
          .eq("company_id", companyId)
          .gte("loan_date", startDate)
          .order("customer_name", { ascending: true });

        if (endDate) query = query.lte("loan_date", endDate);
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error } = await query;

        if (error) {
          console.error("Supabase Query Error:", error);
          if (!cancelled) setGroups([]);
          return;
        }
        
        if (cancelled) return;

        const loans: LoanRecord[] = (data ?? []).map((r: any) => {
          let qty = r.quantity ?? 0;
          let returned = r.returned_quantity ?? 0;
          
          // Tratamento para dados antigos onde quantity foi zerado na devolução
          if (r.status === "returned" && qty === 0 && returned === 0) {
            qty = 1;
            returned = 1;
          }

          const remaining = Math.max(0, qty - returned);

          return {
            id: r.id,
            loan_date: r.loan_date,
            return_date: r.return_date,
            customer_name: r.customer_name ?? "—",
            equipment_name: r.equipments?.name ?? "—",
            quantity: qty,
            note_number: r.note_number ?? null,
            status: r.status ?? null,
            returned_qty: returned,
            remaining_qty: remaining,
            actual_return_date: r.return_date ?? null,
          };
        });

        // Agrupa por cliente
        const map = new Map<string, LoanRecord[]>();
        for (const loan of loans) {
          const key = loan.customer_name;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(loan);
        }

        const grouped: CustomerGroup[] = Array.from(map.entries())
          .map(([customer_name, lns]) => ({
            customer_name,
            loans: lns,
            total_items: lns.reduce((s, l) => s + l.quantity, 0),
            pending: lns.filter((l) => l.status === "active").length,
          }))
          .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

        if (!cancelled) setGroups(grouped);
      } catch (err) {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const displayedGroups = useMemo(() => {
    if (!filterPending) return groups;
    return groups
      .map(g => ({
        ...g,
        loans: g.loans.filter(l => l.status === "active")
      }))
      .filter(g => g.loans.length > 0);
  }, [groups, filterPending]);

  const totalCustomers = displayedGroups.length;
  const totalPending = displayedGroups.reduce((s, g) => s + g.pending, 0);
  const totalLoans = displayedGroups.reduce((s, g) => s + g.loans.length, 0);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end space-x-2">
        <Switch 
          id="filter-pending" 
          checked={filterPending} 
          onCheckedChange={setFilterPending} 
        />
        <Label htmlFor="filter-pending">Somente a recolher</Label>
      </div>
      {triggerDownload && (
        <div className="hidden">
          <PDFDownloadLink
            document={
              <GenericReportPDF
                title="Comodatos Agrupados por Cliente"
                subtitle={`Período: ${formatDate(startDate)} ${endDate ? `até ${formatDate(endDate)}` : ""} ${customerId ? `(Filtro ativo)` : ""}`}
                summary={[
                  { label: "Total de Clientes", value: String(totalCustomers) },
                  { label: "Total de Comodatos", value: String(totalLoans) },
                  { label: "Pendentes de Recolha", value: String(totalPending) },
                ]}
                columns={[
                  { label: "Cliente", key: "customer_name", width: "25%" },
                  { label: "Equipamento", key: "equipment_name", width: "25%" },
                  { label: "Data Entrega", key: "dateFormatted", width: "15%" },
                  { label: "Data Recolha", key: "returnDateFormatted", width: "15%" },
                  { label: "Qtd", key: "quantity", width: "10%", align: "center" },
                  { label: "Status", key: "statusLabel", width: "10%", align: "center" },
                ]}
                data={displayedGroups.flatMap(g => g.loans.map(l => ({
                  ...l,
                  dateFormatted: formatDate(l.loan_date),
                  returnDateFormatted: formatDate(l.actual_return_date ?? l.return_date),
                  statusLabel: l.status === "returned" ? "Recolhido" : "Em uso",
                })))}
              />
            }
            fileName={`comodatos-por-cliente-${startDate}${endDate ? `-ate-${endDate}` : ""}.pdf`}
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
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Clientes com Comodatos</p>
            <p className="text-2xl font-bold">{totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Total de Comodatos</p>
            <p className="text-2xl font-bold">{totalLoans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-muted-foreground">Pendentes de Recolha</p>
            <p className="text-2xl font-bold">{totalPending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Por cliente */}
      {displayedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum comodato encontrado para os filtros informados.
          </CardContent>
        </Card>
      ) : (
        displayedGroups.map((group) => (
          <Card key={group.customer_name}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="uppercase font-semibold tracking-wide">{group.customer_name}</span>
                <div className="flex gap-2 text-sm font-normal">
                  <Badge variant="outline">{group.loans.length} comodato(s)</Badge>
                  <Badge variant="secondary">{group.total_items} un. entregues</Badge>
                  {group.pending > 0 && (
                    <Badge variant="default">{group.pending} em uso</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="overflow-x-auto px-6 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material / Equipamento</TableHead>
                      <TableHead>Data Entrega</TableHead>
                      <TableHead>Data Recolha</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                      <TableHead className="text-center">Recolhido</TableHead>
                      <TableHead className="text-center">Restante</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.loans.map((loan) => {
                      const hasReturn = loan.status === "returned";
                      return (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.equipment_name}</TableCell>
                          <TableCell>{formatDate(loan.loan_date)}</TableCell>
                          <TableCell>
                            {hasReturn ? formatDate(loan.actual_return_date ?? loan.return_date) : "—"}
                          </TableCell>
                          <TableCell className="text-center">{loan.quantity}</TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {loan.returned_qty ?? "—"}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {loan.remaining_qty != null ? loan.remaining_qty : "—"}
                          </TableCell>
                          <TableCell>{loan.note_number ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={hasReturn ? "secondary" : "outline"}>
                              {hasReturn ? "Recolhido" : "Em uso"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
