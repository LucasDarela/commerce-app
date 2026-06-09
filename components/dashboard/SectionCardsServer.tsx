"use client";

import { useEffect, useMemo, useState } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Droplets,
  Users,
  Receipt,
  Truck,
  Calendar,
  AlertTriangle,
  CreditCard,
  Package,
} from "lucide-react";

type DashboardStats = {
  receitaLiquida: number;
  receitaAnterior: number;
  aReceber: number;
  aPagar: number;
  pedidosMes: number;
  pedidosMesAnterior: number;
  litrosMes: number;
  clientesAtivos: number;
  ticketMedio: number;
  pedidosEntreguesMes: number;
  litrosEntreguesMes: number;
  agendadosFuturo: number;
  litrosAgendadosFuturo: number;
  inadimplentesTotal: number;
  inadimplentesValor: number;
  aPagarHoje: number;
  aPagarHojeQtd: number;
  emprestimosAtivos: number;
};

export function SectionCards() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const fmt = (d: Date) => format(d, "yyyy-MM-dd");
      const fmtToday = fmt(now);

      const [
        ordersCurrent,
        ordersLast,
        inputsCurrent,
        outputsCurrent,
        inputsLast,
        outputsLast,
        customersRes,
        entreguesRes,
        agendadosRes,
        vencidosRes,
        aPagarHojeRes,
        emprestimosRes,
      ] = await Promise.all([
        // Pedidos do mês atual (vencimento)
        supabase
          .from("orders")
          .select("id, total, total_payed, payment_status, customer_id")
          .eq("company_id", companyId)
          .gte("due_date", fmt(startOfMonth))
          .lt("due_date", fmt(startOfNextMonth)),

        // Pedidos do mês anterior (vencimento)
        supabase
          .from("orders")
          .select("total, total_payed, payment_status")
          .eq("company_id", companyId)
          .gte("due_date", fmt(startOfLastMonth))
          .lt("due_date", fmt(startOfMonth)),

        // Despesas do mês (registros financeiros de entrada = custo)
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "input")
          .gte("due_date", fmt(startOfMonth))
          .lt("due_date", fmt(startOfNextMonth)),

        // Receitas financeiras extras do mês (registros financeiros de saída = receita)
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "output")
          .gte("due_date", fmt(startOfMonth))
          .lt("due_date", fmt(startOfNextMonth)),

        // Despesas do mês anterior
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "input")
          .gte("due_date", fmt(startOfLastMonth))
          .lt("due_date", fmt(startOfMonth)),

        // Receitas financeiras extras do mês anterior
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "output")
          .gte("due_date", fmt(startOfLastMonth))
          .lt("due_date", fmt(startOfMonth)),

        // IDs dos pedidos do mês para buscar order_items
        supabase
          .from("orders")
          .select("customer_id")
          .eq("company_id", companyId)
          .gte("due_date", fmt(startOfMonth))
          .lt("due_date", fmt(startOfNextMonth))
          .not("customer_id", "is", null),

        // Pedidos entregues no mês
        supabase
          .from("orders")
          .select("id")
          .eq("company_id", companyId)
          .in("delivery_status", ["Coletar", "Coletado"])
          .gte("delivered_at", startOfMonth.toISOString())
          .lt("delivered_at", startOfNextMonth.toISOString()),

        // Agendados (Futuro)
        supabase
          .from("orders")
          .select("id")
          .eq("company_id", companyId)
          .gte("appointment_date", fmtToday)
          .in("delivery_status", ["Entregar", "Pendente"]),

        // Boletos Vencidos
        supabase
          .from("orders")
          .select("total")
          .eq("company_id", companyId)
          .eq("payment_method", "Boleto")
          .eq("payment_status", "pendente")
          .lt("due_date", fmtToday),

        // A Pagar Hoje
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "input")
          .in("status", ["Unpaid", "pendente"])
          .eq("due_date", fmtToday),

        // Empréstimos Ativos
        supabase
          .from("equipment_loans")
          .select("id", { count: "exact" })
          .eq("company_id", companyId)
          .eq("status", "active"),
      ]);

      const orderIds = (ordersCurrent.data ?? []).map((o: any) => o.id);
      const entreguesIds = (entreguesRes.data ?? []).map((o: any) => o.id);
      const agendadosIds = (agendadosRes.data ?? []).map((o: any) => o.id);
      const allRelevantIds = [...new Set([...orderIds, ...entreguesIds, ...agendadosIds])];

      let litrosMes = 0;
      let litrosEntreguesMes = 0;
      let litrosAgendadosFuturo = 0;

      if (allRelevantIds.length > 0) {
        // Busca todos os produtos da empresa para filtrar client-side
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, name")
          .eq("company_id", companyId);

        const litroRegex = /(\d+(?:[.,]\d+)?)\s*(LTS|LT|L)\b/i;
        const litrosPorUnidade = new Map<string, number>();
        for (const p of allProducts ?? []) {
          const match = litroRegex.exec(p.name ?? "");
          if (match) {
            const volume = parseFloat(match[1].replace(",", "."));
            litrosPorUnidade.set(p.id, volume);
          }
        }

        // Busca os order_items relevantes
        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity")
          .in("order_id", allRelevantIds);

        if (itemsError) {
          console.error("[Dashboard] Erro ao buscar order_items:", itemsError);
        }

        // Calcula litragens
        for (const item of itemsData ?? []) {
          const volume = litrosPorUnidade.get(String(item.product_id));
          if (volume) {
            const added = volume * Number(item.quantity ?? 0);
            if (orderIds.includes(item.order_id)) litrosMes += added;
            if (entreguesIds.includes(item.order_id)) litrosEntreguesMes += added;
            if (agendadosIds.includes(item.order_id)) litrosAgendadosFuturo += added;
          }
        }
      }

      // Receita e cálculos
      const orders = ordersCurrent.data ?? [];
      const ordersAnt = ordersLast.data ?? [];
      const inputs = inputsCurrent.data ?? [];
      const outputs = outputsCurrent.data ?? [];
      const inputsAnt = inputsLast.data ?? [];
      const outputsAnt = outputsLast.data ?? [];

      const totalVendas = orders.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const totalFinanceiroSaida = outputs.reduce((sum: number, o: any) => sum + Number(o.amount ?? 0), 0);
      const totalReceber = totalVendas + totalFinanceiroSaida;

      const totalPagar = inputs.reduce((sum: number, i: any) => sum + Number(i.amount ?? 0), 0);
      const receitaAtual = totalReceber - totalPagar;

      const totalVendasAnt = ordersAnt.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const totalFinanceiroSaidaAnt = outputsAnt.reduce((sum: number, o: any) => sum + Number(o.amount ?? 0), 0);
      const totalReceberAnt = totalVendasAnt + totalFinanceiroSaidaAnt;

      const totalPagarAnt = inputsAnt.reduce((sum: number, i: any) => sum + Number(i.amount ?? 0), 0);
      const receitaAnterior = totalReceberAnt - totalPagarAnt;

      const uniqueCustomers = new Set(
        (customersRes.data ?? []).map((o: any) => o.customer_id).filter(Boolean),
      );

      const ticketMedio = orders.length > 0 ? totalVendas / orders.length : 0;
      const pedidosMesAnterior = ordersAnt.length;

      // NOVOS CALCULOS
      const inadimplentesValor = (vencidosRes.data ?? []).reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const inadimplentesTotal = (vencidosRes.data ?? []).length;

      const aPagarHojeValor = (aPagarHojeRes.data ?? []).reduce((sum: number, i: any) => sum + Number(i.amount ?? 0), 0);
      const aPagarHojeQtd = (aPagarHojeRes.data ?? []).length;

      setStats({
        receitaLiquida: receitaAtual,
        receitaAnterior,
        aReceber: totalReceber,
        aPagar: totalPagar,
        pedidosMes: orders.length,
        pedidosMesAnterior,
        litrosMes,
        clientesAtivos: uniqueCustomers.size,
        ticketMedio,
        pedidosEntreguesMes: entreguesIds.length,
        litrosEntreguesMes,
        agendadosFuturo: agendadosIds.length,
        litrosAgendadosFuturo,
        inadimplentesTotal,
        inadimplentesValor,
        aPagarHoje: aPagarHojeValor,
        aPagarHojeQtd,
        emprestimosAtivos: emprestimosRes.count ?? 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [companyId]);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const growthRate = (current: number, previous: number) =>
    previous === 0
      ? current === 0 ? 0 : 100
      : ((current - previous) / Math.abs(previous)) * 100;

  const monthName = format(new Date(), "MMMM", { locale: ptBR });

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3 @xl/main:grid-cols-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-xl" />
        ))}
      </div>
    );
  }

  const receitaGrowth = growthRate(stats.receitaLiquida, stats.receitaAnterior);
  const pedidosGrowth = growthRate(stats.pedidosMes, stats.pedidosMesAnterior);

  const cards = [
    {
      icon: DollarSign,
      label: "Receita Líquida",
      value: formatCurrency(stats.receitaLiquida),
      footer: "Vendas menos despesas do mês",
      badge: formatPercent(receitaGrowth),
      up: receitaGrowth >= 0,
    },
    {
      icon: Receipt,
      label: "A Receber (Mês)",
      value: formatCurrency(stats.aReceber),
      footer: `Total em vendas de ${monthName}`,
      badge: null,
      up: true,
    },
    {
      icon: TrendingUp,
      label: "A Pagar (Mês)",
      value: formatCurrency(stats.aPagar),
      footer: "Despesas lançadas no mês",
      badge: null,
      up: false,
    },

    {
      icon: ShoppingCart,
      label: "Pedidos no Mês",
      value: String(stats.pedidosMes),
      footer: `${stats.litrosMes.toLocaleString("pt-BR")} L previstos no total`,
      badge: formatPercent(pedidosGrowth),
      up: pedidosGrowth >= 0,
    },
    {
      icon: Truck,
      label: "Entregues no Mês",
      value: String(stats.pedidosEntreguesMes),
      footer: `${stats.litrosEntreguesMes.toLocaleString("pt-BR")} L concluídos`,
      badge: null,
      up: true,
    },
    {
      icon: Calendar,
      label: "Agendados (Futuro)",
      value: String(stats.agendadosFuturo),
      footer: `${stats.litrosAgendadosFuturo.toLocaleString("pt-BR")} L pendentes`,
      badge: null,
      up: true,
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 md:grid-cols-3 @xl/main:grid-cols-3 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {card.label}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              {card.badge && (
                <CardAction className="z-20">
                  <Badge variant="outline">
                    {card.up ? (
                      <IconTrendingUp className="mr-1" />
                    ) : (
                      <IconTrendingDown className="mr-1" />
                    )}
                    {card.badge}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="text-muted-foreground">{card.footer}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
