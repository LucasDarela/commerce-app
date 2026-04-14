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

type StockReportProps = {
  companyId: string;
  startDate?: string;
  endDate?: string;
};

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    return format(parseISO(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return date;
  }
}

function translateMovementType(type: string) {
  switch (type) {
    case "entry":
      return { label: "Entrada", variant: "default" as const };
    case "exit":
      return { label: "Saída", variant: "destructive" as const };
    case "return":
      return { label: "Retorno", variant: "outline" as const };
    default:
      return { label: type, variant: "secondary" as const };
  }
}

// --- 1. Estoque / Movimentações ---
export function StockMovementsReport({ companyId, startDate, endDate }: StockReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("stock_movements")
          .select(`
            id,
            created_at,
            type,
            quantity,
            reason,
            products (name, code)
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
        if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

        const { data, error } = await query;
        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar movimentações.");
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
        <CardTitle>Histórico de Movimentações de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => {
              const type = translateMovementType(r.type);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium uppercase">
                    {r.products?.name} <span className="text-muted-foreground text-[10px]">({r.products?.code})</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.variant}>{type.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{r.quantity}</TableCell>
                  <TableCell className="text-muted-foreground italic text-xs max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma movimentação encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 2. Posição Atual de Estoque ---
export function CurrentStockPositionReport({ companyId }: StockReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, code, name, stock, material_class")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar posição de estoque.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posição Atual de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Estoque Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{r.code}</TableCell>
                <TableCell className="font-medium uppercase">{r.name}</TableCell>
                <TableCell className="uppercase">{r.material_class || "—"}</TableCell>
                <TableCell className={`text-right font-bold ${Number(r.stock) <= 0 ? "text-red-600" : ""}`}>
                  {r.stock}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 3. Produtos com Estoque Baixo ---
export function LowStockProductsReport({ companyId }: StockReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const LOW_STOCK_THRESHOLD = 5;

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, code, name, stock, material_class")
          .eq("company_id", companyId)
          .lte("stock", LOW_STOCK_THRESHOLD)
          .order("stock", { ascending: true });

        if (error) throw error;
        setRows(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar estoque baixo.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, supabase]);

  if (loading) return <TableSkeleton />;

  return (
    <Card className="border-orange-200">
      <CardHeader className="bg-orange-50/50">
        <CardTitle className="text-orange-700">Produtos com Estoque Baixo (Limite: {LOW_STOCK_THRESHOLD})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Estoque Atual</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{r.code}</TableCell>
                <TableCell className="font-medium uppercase">{r.name}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{r.stock}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={Number(r.stock) <= 0 ? "destructive" : "outline"} className={Number(r.stock) > 0 ? "text-orange-600 border-orange-200" : ""}>
                    {Number(r.stock) <= 0 ? "Esgotado" : "Crítico"}
                  </Badge>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Todos os produtos estão com estoque adequado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- 4. Devoluções por Produto ---
export function ReturnsByProductReport({ companyId, startDate, endDate }: StockReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("stock_movements")
          .select(`
            quantity,
            products (name, code)
          `)
          .eq("company_id", companyId)
          .eq("type", "return");

        if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
        if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

        const { data: movements, error } = await query;
        if (error) throw error;

        const groupedMap: Record<string, { name: string; code: string; total: number }> = {};
        movements?.forEach(m => {
          const product = m.products as any;
          if (!product) return;
          const key = product.name;
          if (!groupedMap[key]) groupedMap[key] = { name: product.name, code: product.code, total: 0 };
          groupedMap[key].total += Number(m.quantity || 0);
        });

        setData(Object.values(groupedMap).sort((a, b) => b.total - a.total));
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar relatório de devoluções.");
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
        <CardTitle>Devoluções por Produto</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Total Devolvido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium uppercase">
                  {r.name} <span className="text-muted-foreground text-[10px]">({r.code})</span>
                </TableCell>
                <TableCell className="text-right font-bold text-blue-600">{r.total}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">Nenhuma devolução registrada no período.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
