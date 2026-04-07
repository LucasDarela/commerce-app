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

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

interface BaseProps {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
}

type Customer = {
  id: string;
  name: string | null;
  fantasy_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  type: string;
  price_table_id: string;
  price_table_name?: string | null;
  created_at: string | null;
  emit_nf: boolean | null;
};

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
// 1. Histórico Completo por Cliente
//    Mostra os pedidos de um cliente selecionado
// ─────────────────────────────────────────────

type OrderRow = {
  id: string;
  note_number: string | null;
  appointment_date: string | null;
  due_date: string | null;
  products: string | null;
  total: number | null;
  total_payed: number | null;
  payment_status: string | null;
};

function paymentLabel(status: string | null) {
  switch (status) {
    case "Paid": return "Pago";
    case "Partial": return "Parcial";
    case "Pending":
    case "Unpaid": return "Não Pago";
    default: return status ?? "—";
  }
}

function paymentVariant(status: string | null): "default" | "secondary" | "outline" {
  if (status === "Paid") return "default";
  if (status === "Partial") return "secondary";
  return "outline";
}

export function CustomerHistoryReport({ companyId, startDate, endDate, customerId }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !startDate) return;
    setLoading(true);

    const run = async () => {
      // Busca dados do cliente
      if (customerId) {
        const { data } = await supabase
          .from("customers")
          .select("id, name, fantasy_name, document, phone, email, city, state, type, price_table_id, created_at, emit_nf, price_tables(name)")
          .eq("id", customerId)
          .maybeSingle();
        if (data && !cancelled) {
          setCustomer({ ...data, price_table_name: (data as any).price_tables?.name ?? null });
        }
      }

      // Busca pedidos
      let query = supabase
        .from("orders")
        .select("id, note_number, appointment_date, due_date, products, total, total_payed, payment_status, customer_id")
        .eq("company_id", companyId)
        .gte("appointment_date", startDate)
        .order("appointment_date", { ascending: false });

      if (endDate) query = query.lte("appointment_date", endDate);
      if (customerId) query = query.eq("customer_id", customerId);

      const { data: ordersData } = await query;
      if (!cancelled) {
        setOrders((ordersData ?? []) as OrderRow[]);
        setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, customerId, supabase]);

  const totalVendas = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalPago = orders.reduce((s, o) => s + (o.total_payed ?? 0), 0);
  const totalAberto = Math.max(totalVendas - totalPago, 0);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Info do cliente */}
      {customer && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base uppercase">{customer.name ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: "Fantasia", value: customer.fantasy_name },
                { label: "Documento", value: customer.document },
                { label: "Telefone", value: customer.phone },
                { label: "E-mail", value: customer.email },
                { label: "Cidade", value: customer.city ? `${customer.city}/${customer.state}` : null },
                { label: "Tipo", value: customer.type },
                { label: "Tabela de Preço", value: customer.price_table_name },
                { label: "Cliente desde", value: formatDate(customer.created_at) },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium">{f.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!customerId && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Selecione um <strong>Cliente</strong> no filtro acima para ver o histórico completo.
          </CardContent>
        </Card>
      )}

      {/* Resumo financeiro */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Pedidos", value: String(orders.length) },
            { label: "Total Vendido", value: formatCurrency(totalVendas) },
            { label: "Total Pago", value: formatCurrency(totalPago) },
            { label: "Em Aberto", value: formatCurrency(totalAberto) },
          ].map((c) => (
            <Card key={c.label}><CardContent className="py-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Tabela de pedidos */}
      {customerId && (
        <Card><CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.length > 0 ? orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{formatDate(o.appointment_date)}</TableCell>
                    <TableCell>{formatDate(o.due_date)}</TableCell>
                    <TableCell>{o.note_number ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs">{o.products ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(o.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(o.total_payed)}</TableCell>
                    <TableCell><Badge variant={paymentVariant(o.payment_status)}>{paymentLabel(o.payment_status)}</Badge></TableCell>
                  </TableRow>
                )) : <EmptyRow cols={7} />}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. Clientes Ativos e Inativos
//    Ativo = fez pedido no período. Inativo = não fez.
// ─────────────────────────────────────────────

export function ActiveInactiveCustomersReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Customer[]>([]);
  const [inactive, setInactive] = useState<Customer[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !startDate) return;
    setLoading(true);

    const run = async () => {
      // Todos os clientes da empresa
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("id, name, fantasy_name, document, phone, email, city, state, type, price_table_id, created_at, emit_nf")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      // IDs que fizeram pedido no período
      let ordersQuery = supabase
        .from("orders")
        .select("customer_id")
        .eq("company_id", companyId)
        .gte("appointment_date", startDate);

      if (endDate) ordersQuery = ordersQuery.lte("appointment_date", endDate);
      const { data: ordersData } = await ordersQuery;

      if (cancelled) return;

      const activeIds = new Set((ordersData ?? []).map((o: any) => o.customer_id).filter(Boolean));
      const all = (allCustomers ?? []) as Customer[];

      setActive(all.filter((c) => activeIds.has(c.id)));
      setInactive(all.filter((c) => !activeIds.has(c.id)));
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  const CustomerTable = ({ customers, title, variant }: { customers: Customer[]; title: string; variant: "default" | "outline" }) => (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <p className="font-semibold text-sm">{title}</p>
          <Badge variant={variant}>{customers.length} cliente(s)</Badge>
        </div>
        <div className="overflow-x-auto px-6 pb-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente desde</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {customers.length > 0 ? customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium uppercase">{c.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.document ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.city ? `${c.city}/${c.state}` : "—"}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{formatDate(c.created_at)}</TableCell>
                </TableRow>
              )) : <EmptyRow cols={6} />}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de Clientes", value: active.length + inactive.length },
          { label: "Ativos no Período", value: active.length },
          { label: "Inativos no Período", value: inactive.length },
        ].map((c) => (
          <Card key={c.label}><CardContent className="py-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <CustomerTable title="✓ Clientes Ativos" customers={active} variant="default" />
      <CustomerTable title="Clientes Inativos" customers={inactive} variant="outline" />
    </div>
  );
}

// ─────────────────────────────────────────────
// 3. Novos Clientes por Período
//    Clientes cujo created_at está no intervalo
// ─────────────────────────────────────────────

export function NewCustomersByPeriodReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Customer[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !startDate) return;
    setLoading(true);

    const run = async () => {
      let query = supabase
        .from("customers")
        .select("id, name, fantasy_name, document, phone, email, city, state, type, price_table_id, created_at, emit_nf")
        .eq("company_id", companyId)
        .gte("created_at", `${startDate}T00:00:00`)
        .order("created_at", { ascending: false });

      if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

      const { data } = await query;
      if (!cancelled) { setRows((data ?? []) as Customer[]); setLoading(false); }
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  // Agrupa por mês
  const byMonth = useMemo(() => {
    const map = new Map<string, Customer[]>();
    for (const c of rows) {
      const key = c.created_at
        ? format(new Date(c.created_at), "MMMM yyyy", { locale: ptBR })
        : "Sem data";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Novos Clientes no Período</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Meses com cadastros</p>
          <p className="text-2xl font-bold">{byMonth.length}</p>
        </CardContent></Card>
      </div>

      {byMonth.map(([month, customers]) => (
        <Card key={month}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <p className="font-semibold capitalize">{month}</p>
              <Badge variant="outline">{customers.length} novo(s)</Badge>
            </div>
            <div className="overflow-x-auto px-6 pb-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium uppercase">{c.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.document ?? "—"}</TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>{c.city ? `${c.city}/${c.state}` : "—"}</TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nenhum novo cliente cadastrado no período informado.
        </CardContent></Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 4. Clientes por Tabela de Preço
//    Agrupa clientes pela tabela de preço vinculada
// ─────────────────────────────────────────────

export function CustomersByPriceTableReport({ companyId, startDate, endDate }: BaseProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{ tableName: string; customers: Customer[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;
    setLoading(true);

    const run = async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, fantasy_name, document, phone, email, city, state, type, price_table_id, created_at, emit_nf, price_tables(name)")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (cancelled) return;

      const all = (data ?? []).map((c: any) => ({
        ...c,
        price_table_name: c.price_tables?.name ?? "Sem tabela",
      })) as (Customer & { price_table_name: string })[];

      const map = new Map<string, Customer[]>();
      for (const c of all) {
        const key = (c as any).price_table_name ?? "Sem tabela";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }

      const grouped = Array.from(map.entries())
        .map(([tableName, customers]) => ({ tableName, customers }))
        .sort((a, b) => a.tableName.localeCompare(b.tableName));

      setGroups(grouped);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Tabelas de Preço</p>
          <p className="text-2xl font-bold">{groups.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-sm text-muted-foreground">Total de Clientes</p>
          <p className="text-2xl font-bold">{groups.reduce((s, g) => s + g.customers.length, 0)}</p>
        </CardContent></Card>
      </div>

      {groups.map((group) => (
        <Card key={group.tableName}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <p className="font-semibold">{group.tableName}</p>
              <Badge variant="secondary">{group.customers.length} cliente(s)</Badge>
            </div>
            <div className="overflow-x-auto px-6 pb-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>NF-e</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {group.customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium uppercase">{c.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.document ?? "—"}</TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>{c.city ? `${c.city}/${c.state}` : "—"}</TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>
                        <Badge variant={c.emit_nf ? "default" : "outline"}>
                          {c.emit_nf ? "Sim" : "Não"}
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
