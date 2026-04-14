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
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type FinancialReportProps = {
  companyId: string;
  startDate: string;
  endDate?: string;
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
    return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

// --- 1. Fluxo de Caixa por Período ---
export function CashFlowReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [ordersRes, financialRes] = await Promise.all([
          supabase.from("orders").select("total, appointment_date").eq("company_id", companyId).gte("appointment_date", startDate).lte("appointment_date", endDate || "9999-12-31"),
          supabase.from("financial_records").select("amount, issue_date, type").eq("company_id", companyId).gte("issue_date", startDate).lte("issue_date", endDate || "9999-12-31")
        ]);

        const dailyMap: Record<string, { date: string; revenue: number; expense: number }> = {};

        ordersRes.data?.forEach(o => {
          const date = o.appointment_date;
          if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, expense: 0 };
          dailyMap[date].revenue += Number(o.total || 0);
        });

        financialRes.data?.forEach(f => {
          const date = f.issue_date;
          if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, expense: 0 };
          if (f.type === "output") dailyMap[date].revenue += Number(f.amount || 0);
          else dailyMap[date].expense += Number(f.amount || 0);
        });

        const sortedData = Object.values(dailyMap)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(item => ({
            ...item,
            formattedDate: formatDate(item.date),
            balance: item.revenue - item.expense
          }));

        let cumulativeBalance = 0;
        const withCumulative = sortedData.map(item => {
          cumulativeBalance += item.balance;
          return { ...item, cumulative: cumulativeBalance };
        });

        setData(withCumulative);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar fluxo de caixa.");
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
        <CardTitle>Fluxo de Caixa (Saldo Acumulado)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="formattedDate" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 2. Contas a Pagar ---
export function AccountsPayableReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("company_id", companyId)
        .eq("type", "input")
        .eq("status", "Unpaid")
        .gte("due_date", startDate)
        .lte("due_date", endDate || "9999-12-31")
        .order("due_date", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar contas a pagar.");
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas a Pagar (Pendentes)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.due_date)}</TableCell>
                <TableCell className="font-medium uppercase">{r.supplier || "—"}</TableCell>
                <TableCell className="uppercase">{r.category || "—"}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{formatCurrency(Number(r.amount))}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Nenhuma conta pendente encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 3. Contas a Pagar Vencidas ---
export function OverduePayablesReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const today = startOfDay(new Date()).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("company_id", companyId)
        .eq("type", "input")
        .eq("status", "Unpaid")
        .lt("due_date", today)
        .gte("due_date", startDate)
        .lte("due_date", endDate || "9999-12-31")
        .order("due_date", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar contas vencidas.");
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card className="border-red-200">
      <CardHeader className="bg-red-50/50">
        <CardTitle className="text-red-700">Contas a Pagar Vencidas ⚠️</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-red-600 font-bold">{formatDate(r.due_date)}</TableCell>
                <TableCell className="font-medium uppercase">{r.supplier || "—"}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{formatCurrency(Number(r.amount))}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Nenhuma conta vencida encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 4. Despesas por Categoria ---
export function ExpensesByCategoryReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("financial_records")
        .select("amount, category")
        .eq("company_id", companyId)
        .eq("type", "input")
        .gte("issue_date", startDate)
        .lte("issue_date", endDate || "9999-12-31");

      if (!error) {
        const catMap: Record<string, number> = {};
        data?.forEach(f => {
          const cat = f.category || "Sem Categoria";
          catMap[cat] = (catMap[cat] || 0) + Number(f.amount);
        });
        setData(Object.entries(catMap).map(([name, value]) => ({ name, value })));
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 5. Receita x Despesa ---
export function RevenueVsExpenseReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [ordersRes, financialRes] = await Promise.all([
          supabase.from("orders").select("total, appointment_date").eq("company_id", companyId).gte("appointment_date", startDate).lte("appointment_date", endDate || "9999-12-31"),
          supabase.from("financial_records").select("amount, issue_date, type").eq("company_id", companyId).gte("issue_date", startDate).lte("issue_date", endDate || "9999-12-31")
        ]);

        const dailyMap: Record<string, { date: string; revenue: number; expense: number }> = {};

        ordersRes.data?.forEach(o => {
          const date = o.appointment_date;
          if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, expense: 0 };
          dailyMap[date].revenue += Number(o.total || 0);
        });

        financialRes.data?.forEach(f => {
          const date = f.issue_date;
          if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, expense: 0 };
          if (f.type === "output") dailyMap[date].revenue += Number(f.amount || 0);
          else dailyMap[date].expense += Number(f.amount || 0);
        });

        const sorted = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
        setData(sorted.map(d => ({ ...d, formattedDate: formatDate(d.date) })));
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
        <CardTitle>Receita x Despesa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="formattedDate" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// --- 6. Resumo Financeiro Mensal ---
export function MonthlyFinancialSummaryReport({ companyId, startDate, endDate }: FinancialReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, balance: 0, pendingPayable: 0, pendingReceivable: 0 });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [ordersRes, financialRes] = await Promise.all([
        supabase.from("orders").select("total, appointment_date, payment_status").eq("company_id", companyId).gte("appointment_date", startDate).lte("appointment_date", endDate || "9999-12-31"),
        supabase.from("financial_records").select("amount, issue_date, type, status").eq("company_id", companyId).gte("issue_date", startDate).lte("issue_date", endDate || "9999-12-31")
      ]);

      let revenue = 0;
      let expense = 0;
      let pendingPayable = 0;
      let pendingReceivable = 0;

      ordersRes.data?.forEach(o => {
        revenue += Number(o.total || 0);
        if (o.payment_status === "Unpaid") pendingReceivable += Number(o.total || 0);
      });

      financialRes.data?.forEach(f => {
        const val = Number(f.amount || 0);
        if (f.type === "output") {
          revenue += val;
          if (f.status === "Unpaid") pendingReceivable += val;
        } else {
          expense += val;
          if (f.status === "Unpaid") pendingPayable += val;
        }
      });

      setTotals({ revenue, expense, balance: revenue - expense, pendingPayable, pendingReceivable });
      setLoading(false);
    }
    fetchData();
  }, [companyId, startDate, endDate, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.revenue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Despesa Total</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatCurrency(totals.balance)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Contas a Pagar (Em Aberto)</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.pendingPayable)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
