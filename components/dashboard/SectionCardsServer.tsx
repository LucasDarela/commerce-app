"use client";

import { useEffect, useState } from "react";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { format } from "date-fns";

export function SectionCards() {
  const [receitaLiquida, setReceitaLiquida] = useState(0);
  const [aReceber, setAReceber] = useState(0);
  const [aPagar, setAPagar] = useState(0);
  const [crescimento, setCrescimento] = useState(0);
  const { companyId } = useAuthenticatedCompany();

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      const supabase = createClientComponentClient<Database>();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

      const [ordersCurrent, ordersLast] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .gte("issue_date", formatDate(startOfMonth))
          .lte("issue_date", formatDate(endOfMonth))
          .eq("company_id", companyId),

        supabase
          .from("orders")
          .select("total")
          .gte("issue_date", formatDate(startOfLastMonth))
          .lte("issue_date", formatDate(endOfLastMonth))
          .eq("company_id", companyId),
      ]);

      const [inputsCurrent] = await Promise.all([
        supabase
          .from("financial_records")
          .select("amount")
          .eq("company_id", companyId)
          .eq("type", "input")
          .gte("issue_date", formatDate(startOfMonth))
          .lte("issue_date", formatDate(endOfMonth)),
      ]);

      const totalReceber =
        ordersCurrent.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalReceberLast =
        ordersLast.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalPagar =
        inputsCurrent.data?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const receitaAtual = totalReceber - totalPagar;
      const receitaAnterior = totalReceberLast;

      setReceitaLiquida(receitaAtual);
      setAReceber(totalReceber);
      setAPagar(totalPagar);

      const crescimento =
        receitaAnterior > 0
          ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
          : 100;
      setCrescimento(crescimento);
    };
    fetchData();
  }, [companyId]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Receita Líquida</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(receitaLiquida)}
          </CardTitle>
          <CardAction className="z-20">
            {/* <Badge variant="outline">
              <IconTrendingUp className="mr-1" />
              {formatPercent(crescimento)}
            </Badge> */}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Receitas menos despesas do mês
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>A Receber</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(aReceber)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Contas a receber não pagas
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>A Pagar</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(aPagar)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Contas a pagar do mês</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Crescimento</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(crescimento)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="mr-1" />
              {formatPercent(crescimento)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Comparado ao mês anterior</div>
        </CardFooter>
      </Card>
    </div>
  );
}
