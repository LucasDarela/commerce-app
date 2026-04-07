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

interface Props {
  companyId: string;
  startDate: string;
  endDate?: string;
  equipmentFilter: string; // nome ou parte do nome do equipamento
}

type EquipmentHistory = {
  id: string;
  loan_date: string;
  actual_return_date: string | null;
  customer_name: string;
  equipment_name: string;
  quantity: number;
  returned_qty: number | null;
  remaining_qty: number | null;
  note_number: string | null;
  is_current: boolean; // ainda em posse do cliente?
};

type EquipmentGroup = {
  equipment_name: string;
  current_holder: string | null;
  history: EquipmentHistory[];
  total_loaned: number;
  total_returned: number;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return format(new Date(`${date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

export function EquipmentTrackerReport({
  companyId,
  startDate,
  endDate,
  equipmentFilter,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!companyId || !startDate || !equipmentFilter.trim()) {
        setLoading(false);
        setGroups([]);
        return;
      }

      setLoading(true);

      try {
        // Busca equipamentos cujo nome contém o filtro
        const { data: equipData, error: equipErr } = await supabase
          .from("equipments")
          .select("id, name")
          .eq("company_id", companyId)
          .ilike("name", `%${equipmentFilter.trim()}%`);

        if (equipErr || cancelled) { if (!cancelled) setGroups([]); return; }

        const equipIds = (equipData ?? []).map((e: any) => e.id);

        if (equipIds.length === 0) {
          if (!cancelled) setGroups([]);
          setLoading(false);
          return;
        }

        // Busca todos os comodatos desses equipamentos
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
            equipment_id,
            equipments(name),
            equipment_loan_returns(return_date, returned_quantity, remaining_quantity)
          `)
          .eq("company_id", companyId)
          .in("equipment_id", equipIds)
          .gte("loan_date", startDate)
          .order("loan_date", { ascending: false });

        if (endDate) query = query.lte("loan_date", endDate);

        const { data: loanData, error: loanErr } = await query;

        if (loanErr || cancelled) { if (!cancelled) setGroups([]); return; }

        // Constrói os registros de histórico
        const records: EquipmentHistory[] = (loanData ?? []).map((r: any) => {
          const returns: any[] = r.equipment_loan_returns ?? [];
          const lastReturn = returns.sort(
            (a: any, b: any) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime()
          )[0] ?? null;

          const hasReturn = !!(lastReturn?.return_date || r.return_date);

          return {
            id: r.id,
            loan_date: r.loan_date,
            actual_return_date: lastReturn?.return_date ?? r.return_date ?? null,
            customer_name: r.customer_name ?? "—",
            equipment_name: r.equipments?.name ?? "—",
            quantity: r.quantity ?? 0,
            returned_qty: lastReturn?.returned_quantity ?? null,
            remaining_qty: lastReturn?.remaining_quantity ?? null,
            note_number: r.note_number ?? null,
            is_current: !hasReturn,
          };
        });

        // Agrupa por equipamento
        const map = new Map<string, EquipmentHistory[]>();
        for (const rec of records) {
          const key = rec.equipment_name;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(rec);
        }

        const grouped: EquipmentGroup[] = Array.from(map.entries()).map(
          ([equipment_name, history]) => {
            const currentHolder =
              history.find((h) => h.is_current)?.customer_name ?? null;
            const total_loaned = history.reduce((s, h) => s + h.quantity, 0);
            const total_returned = history
              .filter((h) => !h.is_current)
              .reduce((s, h) => s + (h.returned_qty ?? h.quantity), 0);

            return {
              equipment_name,
              current_holder: currentHolder,
              history: history.sort(
                (a, b) => new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime()
              ),
              total_loaned,
              total_returned,
            };
          }
        );

        if (!cancelled) setGroups(grouped);
      } catch (err) {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, equipmentFilter, supabase]);

  if (loading) return <TableSkeleton />;

  if (!equipmentFilter.trim()) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Digite o nome do equipamento no campo <strong>"Filtrar por Equipamento"</strong> para rastrear.
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum resultado encontrado para <strong>"{equipmentFilter}"</strong> no período informado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.equipment_name}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base font-semibold">{group.equipment_name}</span>
              <div className="flex flex-wrap gap-2 text-sm font-normal">
                {group.current_holder ? (
                  <Badge variant="default">
                    📍 Atualmente com: {group.current_holder}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disponível / Todos recolhidos</Badge>
                )}
                <Badge variant="outline">{group.total_loaned} un. entregues</Badge>
                <Badge variant="outline">{group.total_returned} un. recolhidas</Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto px-6 pb-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Histórico de Clientes
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
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
                  {group.history.map((h) => (
                    <TableRow key={h.id} className={h.is_current ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium uppercase">{h.customer_name}</TableCell>
                      <TableCell>{formatDate(h.loan_date)}</TableCell>
                      <TableCell>{formatDate(h.actual_return_date)}</TableCell>
                      <TableCell className="text-center">{h.quantity}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {h.returned_qty ?? "—"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {h.remaining_qty != null ? h.remaining_qty : "—"}
                      </TableCell>
                      <TableCell>{h.note_number ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={h.is_current ? "default" : "secondary"}>
                          {h.is_current ? "Em uso" : "Recolhido"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
