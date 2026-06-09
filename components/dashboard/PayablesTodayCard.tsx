"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek, endOfWeek, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PayableRecord = {
  id: string;
  supplier: string | null;
  description: string | null;
  amount: number;
  dueDate: string;
  isToday: boolean;
};

export function PayablesTodayCard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();

  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [inadimplentes, setInadimplentes] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });

      const fmtStart = format(start, "yyyy-MM-dd");
      const fmtEnd = format(end, "yyyy-MM-dd");
      const fmtToday = format(now, "yyyy-MM-dd");

      const fallbackQuery = await supabase
        .from("financial_records")
        .select("id, supplier, description, amount, status, due_date")
        .eq("company_id", companyId)
        .eq("type", "input")
        .gte("due_date", fmtStart)
        .lte("due_date", fmtEnd);

      const vencidosQuery = await supabase
        .from("orders")
        .select("total")
        .eq("company_id", companyId)
        .in("payment_method", ["Boleto", "Ticket"])
        .lt("due_date", fmtToday)
        .eq("payment_status", "pendente");

      if (vencidosQuery.data) {
        const total = vencidosQuery.data.reduce((acc, o) => acc + Number(o.total || 0), 0);
        setInadimplentes({ total, count: vencidosQuery.data.length });
      }

      if (fallbackQuery.data) {
        const unpaid = fallbackQuery.data.filter(
          (r) => r.status === "Unpaid" || r.status === "pendente"
        );
        unpaid.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setPayables(unpaid.map(r => ({
          id: r.id,
          supplier: r.supplier,
          description: r.description,
          amount: Number(r.amount),
          dueDate: r.due_date,
          isToday: r.due_date === fmtToday
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, [companyId]);

  const total = payables.reduce((acc, p) => acc + p.amount, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const hojePayables = payables.filter((p) => p.isToday);
  const aPagarHojeValor = hojePayables.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 sm:grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
              Boletos Vencidos
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCurrency(inadimplentes.total)}
            </CardTitle>
          </CardHeader>
          <div className="flex-col items-start gap-1.5 text-sm px-6 pb-6 pt-0">
            <div className="text-muted-foreground">{inadimplentes.count} pedidos em atraso</div>
          </div>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              A Pagar Hoje
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCurrency(aPagarHojeValor)}
            </CardTitle>
          </CardHeader>
          <div className="flex-col items-start gap-1.5 text-sm px-6 pb-6 pt-0">
            <div className="text-muted-foreground">{hojePayables.length} despesas vencendo hoje</div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col h-[400px]">
        <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-xl">A Pagar Esta Semana</CardTitle>
            <CardDescription>
              {payables.length} despesa{payables.length !== 1 && "s"} totalizando{" "}
              {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead>Fornecedor/Descrição</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Hoje não tenho vencimentos.
                </TableCell>
              </TableRow>
            ) : (
              payables.map((p) => (
                <TableRow key={p.id} className={p.isToday ? "bg-primary/5 hover:bg-primary/10" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="max-w-[130px] truncate sm:max-w-[200px]" 
                          title={p.supplier || "Sem fornecedor"}
                        >
                          {p.supplier || "Sem fornecedor"}
                        </span>
                        {p.isToday && (
                          <Badge variant="destructive" className="px-1.5 text-[10px] h-4 shrink-0">
                            HOJE
                          </Badge>
                        )}
                      </div>
                      {p.description && (
                        <span 
                          className="text-xs text-muted-foreground max-w-[180px] truncate sm:max-w-[250px]"
                          title={p.description}
                        >
                          {p.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={p.isToday ? "font-bold text-destructive" : ""}>
                      {format(parseISO(p.dueDate), "dd/MM", { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-destructive font-semibold">
                    {p.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
