"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Package } from "lucide-react";

type PriceTable = {
  id: string;
  name: string;
};

type CustomerData = {
  id: string;
  name: string;
  price_table_id: string | null;
  phone: string | null;
  lastOrderDate: string | null;
  daysInactive: number | null;
  hasEquipment: boolean;
};

export function InactiveCustomersCard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();

  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [stats, setStats] = useState({ clientesAtivos: 0, emprestimosAtivos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const [tablesRes, customersRes, ordersRes, loansRes] = await Promise.all([
        supabase.from("price_tables").select("id, name").eq("company_id", companyId),
        supabase.from("customers").select("id, name, price_table_id, phone").eq("company_id", companyId),
        supabase.from("orders").select("customer_id, created_at").eq("company_id", companyId),
        supabase.from("equipment_loans").select("customer_id").eq("company_id", companyId).eq("status", "active"),
      ]);

      setPriceTables(tablesRes.data ?? []);

      const ordersData = ordersRes.data ?? [];
      const lastOrderMap = new Map<string, string>();

      for (const order of ordersData) {
        if (!order.customer_id) continue;
        const current = lastOrderMap.get(order.customer_id);
        if (!current || new Date(order.created_at) > new Date(current)) {
          lastOrderMap.set(order.customer_id, order.created_at);
        }
      }

      const activeLoans = new Set((loansRes.data ?? []).map(l => l.customer_id));

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const activeCustomersThisMonth = new Set<string>();

      for (const order of ordersData) {
        if (order.customer_id && new Date(order.created_at) >= startOfMonth) {
          activeCustomersThisMonth.add(order.customer_id);
        }
      }

      setStats({
        clientesAtivos: activeCustomersThisMonth.size,
        emprestimosAtivos: activeLoans.size,
      });

      const customerData: CustomerData[] = (customersRes.data ?? []).map((c) => {
        const lastDate = lastOrderMap.get(c.id);
        const days = lastDate ? differenceInDays(now, parseISO(lastDate)) : null;

        return {
          id: c.id,
          name: c.name,
          price_table_id: c.price_table_id,
          phone: c.phone,
          lastOrderDate: lastDate || null,
          daysInactive: days,
          hasEquipment: activeLoans.has(c.id),
        };
      });

      setCustomers(customerData);
      setLoading(false);
    };

    fetchData();
  }, [companyId]);

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(
      (c) => c.hasEquipment && (c.daysInactive === null || c.daysInactive > 7)
    );

    if (selectedTable !== "all") {
      filtered = filtered.filter((c) => c.price_table_id === selectedTable);
    }

    // Sort by days inactive (descending, nulls first - meaning never ordered)
    return filtered.sort((a, b) => {
      if (a.daysInactive === null) return -1;
      if (b.daysInactive === null) return 1;
      return b.daysInactive - a.daysInactive;
    });
  }, [customers, selectedTable]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[130px] rounded-xl" />
          <Skeleton className="h-[130px] rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const monthName = format(new Date(), "MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-4">
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 sm:grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Clientes Ativos
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.clientesAtivos}
            </CardTitle>
          </CardHeader>
          <div className="flex-col items-start gap-1.5 text-sm px-6 pb-6 pt-0">
            <div className="text-muted-foreground">Clientes com pedido em {monthName}</div>
          </div>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              Empréstimos Ativos
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.emprestimosAtivos}
            </CardTitle>
          </CardHeader>
          <div className="flex-col items-start gap-1.5 text-sm px-6 pb-6 pt-0">
            <div className="text-muted-foreground">Clientes com comodato</div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col h-[400px]">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Clientes Inativos</CardTitle>
            <CardDescription>Clientes sem pedidos há mais de 7 dias</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tabela de Preço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tabelas</SelectItem>
                {priceTables.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Último Pedido</TableHead>
              <TableHead className="text-right">Inativo há</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Nenhum cliente inativo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="max-w-[130px] truncate sm:max-w-[200px]" title={c.name}>
                        {c.name}
                      </span>
                      {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.lastOrderDate
                      ? format(parseISO(c.lastOrderDate), "dd/MM/yyyy", { locale: ptBR })
                      : "Nunca comprou"}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.daysInactive !== null ? (
                      <span className="text-destructive font-semibold">{c.daysInactive} dias</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
}
