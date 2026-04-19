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

      const [
        ordersCurrent,
        ordersLast,
        inputsCurrent,
        customersRes,
      ] = await Promise.all([
        // Pedidos do mês atual
        supabase
          .from("orders")
          .select("id, total, total_payed, payment_status, customer_id")
          .eq("company_id", companyId)
          .gte("issue_date", fmt(startOfMonth))
          .lt("issue_date", fmt(startOfNextMonth)),

        // Pedidos do mês anterior
        supabase
          .from("orders")
          .select("total, total_payed, payment_status")
          .eq("company_id", companyId)
          .gte("issue_date", fmt(startOfLastMonth))
          .lt("issue_date", fmt(startOfMonth)),

        // Despesas do mês (registros financeiros de entrada = custo)
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "input")
          .gte("issue_date", fmt(startOfMonth))
          .lt("issue_date", fmt(startOfNextMonth)),

        // IDs dos pedidos do mês para buscar order_items
        supabase
          .from("orders")
          .select("customer_id")
          .eq("company_id", companyId)
          .gte("issue_date", fmt(startOfMonth))
          .lt("issue_date", fmt(startOfNextMonth))
          .not("customer_id", "is", null),
      ]);

      // IDs dos pedidos do mês
      const orderIds = (ordersCurrent.data ?? []).map((o: any) => o.id);

      let litrosMes = 0;
      if (orderIds.length > 0) {
        // Busca todos os produtos da empresa para filtrar client-side
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, name")
          .eq("company_id", companyId);

        // Regex: captura número + LTS | LT | L no nome do produto
        // Ex: "CHOPP LAGER HEINEKEN 30LTS" → 30
        //     "BARRIL 50LT" → 50 | "CHOPP 30L" → 30
        const litroRegex = /(\d+(?:[.,]\d+)?)\s*(LTS|LT|L)\b/i;

        // Mapa product_id → litros por unidade
        const litrosPorUnidade = new Map<string, number>();
        for (const p of allProducts ?? []) {
          const match = litroRegex.exec(p.name ?? "");
          if (match) {
            const volume = parseFloat(match[1].replace(",", "."));
            litrosPorUnidade.set(p.id, volume);
          }
        }

        // Busca os order_items do mês
        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .in("order_id", orderIds);

        if (itemsError) {
          console.error("[Dashboard] Erro ao buscar order_items:", itemsError);
        }

        // Litros reais = soma de (volume_por_unidade × quantidade)
        litrosMes = (itemsData ?? []).reduce((sum: number, item: any) => {
          const volume = litrosPorUnidade.get(String(item.product_id));
          if (volume) {
            return sum + volume * Number(item.quantity ?? 0);
          }
          return sum;
        }, 0);
      }

      // Receita e cálculos
      const orders = ordersCurrent.data ?? [];
      const ordersAnt = ordersLast.data ?? [];
      const inputs = inputsCurrent.data ?? [];

      const totalReceber = orders.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const totalPagar = inputs.reduce((sum: number, i: any) => sum + Number(i.amount ?? 0), 0);
      const receitaAtual = totalReceber - totalPagar;

      const totalReceberAnt = ordersAnt.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const totalPagarAnt = 0; // não buscamos despesas anteriores para simplicidade
      const receitaAnterior = totalReceberAnt - totalPagarAnt;

      // Clientes únicos
      const uniqueCustomers = new Set(
        (customersRes.data ?? []).map((o: any) => o.customer_id).filter(Boolean),
      );

      // Ticket médio
      const ticketMedio = orders.length > 0 ? totalReceber / orders.length : 0;

      // Pedidos mês anterior
      const pedidosMesAnterior = ordersAnt.length;

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
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
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
      label: "A Receber",
      value: formatCurrency(stats.aReceber),
      footer: `Total em vendas de ${monthName}`,
      badge: null,
      up: true,
    },
    {
      icon: TrendingUp,
      label: "A Pagar",
      value: formatCurrency(stats.aPagar),
      footer: "Despesas lançadas no mês",
      badge: null,
      up: false,
    },
    {
      icon: ShoppingCart,
      label: "Pedidos no Mês",
      value: String(stats.pedidosMes),
      footer: `${stats.pedidosMesAnterior} no mês anterior`,
      badge: formatPercent(pedidosGrowth),
      up: pedidosGrowth >= 0,
    },
    {
      icon: Droplets,
      label: "Litros Vendidos",
      value: `${stats.litrosMes.toLocaleString("pt-BR")} L`,
      footer: `Chopp vendido em ${monthName}`,
      badge: null,
      up: true,
    },
    {
      icon: Users,
      label: "Clientes Ativos",
      value: String(stats.clientesAtivos),
      footer: `Clientes com pedido em ${monthName}`,
      badge: null,
      up: true,
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
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
