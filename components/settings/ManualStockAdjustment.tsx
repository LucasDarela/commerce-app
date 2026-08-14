import React, { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  stock: number;
}

interface StockAdjustment {
  id: string;
  product_id: string;
  username: string;
  previous_stock: number;
  new_stock: number;
  difference: number;
  reason: string;
  created_at: string;
  product_name?: string;
}

export default function ManualStockAdjustment() {
  const { companyId, user } = useAuthenticatedCompany();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [newStock, setNewStock] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [history, setHistory] = useState<StockAdjustment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetchProducts();
  }, [companyId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products", err);
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchHistory = async () => {
    if (!companyId) return;
    setHistoryLoading(true);
    try {
      // Usar join manual ou se nao funcionar, buscar produtos pro mapping
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select(
          "id, product_id, username, previous_stock, new_stock, difference, reason, created_at",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching stock history", error);
        toast.error("Erro ao carregar histórico");
        return;
      }

      // Map product names
      const historyWithNames =
        data?.map((item) => ({
          ...item,
          product_name:
            products.find((p) => p.id === item.product_id)?.name ||
            "Produto Desconhecido",
        })) || [];

      setHistory(historyWithNames);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchHistory();
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredProducts = products.filter((product) => {
    const search = productSearch.toLowerCase().trim();
    if (!search) return true;
    return product.name.toLowerCase().includes(search);
  });

  const handleAdjustStock = async () => {
    if (!companyId || !user) {
      toast.error("Sessão inválida");
      return;
    }
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }
    if (newStock === "" || isNaN(Number(newStock))) {
      toast.error("Informe a nova quantidade válida");
      return;
    }
    if (!reason.trim()) {
      toast.error("Informe o motivo do ajuste");
      return;
    }

    const newStockNum = Number(newStock);
    const prevStockNum = Number(selectedProduct.stock || 0);
    const diff = newStockNum - prevStockNum;

    if (diff === 0) {
      toast.error("A nova quantidade é igual à atual");
      return;
    }

    setLoading(true);
    try {
      // 1. Atualiza o produto
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStockNum })
        .eq("id", selectedProduct.id)
        .eq("company_id", companyId);

      if (updateError) throw updateError;

      // 2. Insere histórico
      const username = user.user_metadata?.name || user.email || "Usuário";
      const { error: historyError } = await supabase
        .from("stock_adjustments")
        .insert({
          company_id: companyId,
          product_id: selectedProduct.id,
          user_id: user.id,
          username,
          previous_stock: prevStockNum,
          new_stock: newStockNum,
          difference: diff,
          reason: reason.trim(),
        });

      if (historyError) {
        console.error("Failed to insert history", historyError);
        // Mesmo falhando histórico, o estoque atualizou, mas mostramos erro de log
        toast.error(
          "Estoque atualizado, mas falhou ao salvar o log de histórico.",
        );
      } else {
        toast.success("Estoque ajustado com sucesso!");
      }

      // Reset
      setNewStock("");
      setReason("");
      setSelectedProductId("");
      // Atualizar lista local
      await fetchProducts();
    } catch (err) {
      console.error("Error adjusting stock", err);
      toast.error("Erro ao ajustar o estoque");
    } finally {
      setLoading(false);
    }
  };

  const diff =
    selectedProduct && newStock !== ""
      ? Number(newStock) - Number(selectedProduct.stock || 0)
      : null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      {/* ── Form ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Produto */}
          <div className="space-y-1.5">
            <Label className="font-medium">Produto</Label>
            <Popover open={productOpen} onOpenChange={setProductOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedProduct
                      ? `${selectedProduct.name} — estoque atual: ${selectedProduct.stock || 0}`
                      : "Buscar produto…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Digite para buscar…"
                    value={productSearch}
                    onValueChange={setProductSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            setSelectedProductId(p.id);
                            setProductOpen(false);
                            setProductSearch("");
                          }}
                          className="flex items-center cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedProductId === p.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="flex-1">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Atual: {p.stock || 0}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Nova quantidade + preview diff */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Nova Quantidade</Label>
              {diff !== null && diff !== 0 && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    diff > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {diff > 0 ? `+${diff}` : diff} unidades
                </span>
              )}
            </div>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 50"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
            />
            {selectedProduct && (
              <p className="text-[11px] text-muted-foreground">
                Estoque atual: <strong>{selectedProduct.stock || 0}</strong>{" "}
                unidades
              </p>
            )}
          </div>
        </div>

        {/* Motivo */}
        <div className="space-y-1.5">
          <Label className="font-medium">Motivo do Ajuste</Label>
          <Input
            placeholder="Ex: Balanço de estoque, perda por validade, entrada avulsa…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAdjustStock}
              disabled={
                loading || !selectedProductId || !newStock || !reason.trim()
              }
              className="min-w-[140px]"
            >
              {loading ? "Ajustando…" : "Salvar Ajuste"}
            </Button>
            
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Ver Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Histórico de Ajustes de Estoque</DialogTitle>
                </DialogHeader>

                {historyLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Carregando histórico…
                  </p>
                ) : (
                  <div className="rounded-lg border overflow-hidden mt-2">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Data</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Diferença</TableHead>
                          <TableHead className="text-right">
                            Estoque Final
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.length > 0 ? (
                          history.map((h) => (
                            <TableRow
                              key={h.id}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                {format(
                                  new Date(h.created_at),
                                  "dd/MM/yyyy HH:mm",
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {h.username}
                              </TableCell>
                              <TableCell>{h.product_name}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                {h.reason}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    h.difference > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {h.difference > 0
                                    ? `+${h.difference}`
                                    : h.difference}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {h.new_stock}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-10 text-sm"
                            >
                              Nenhum ajuste registrado ainda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {diff !== null && diff === 0 && (
            <p className="text-xs text-amber-600">
              A nova quantidade é igual à atual — nenhuma alteração será feita.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
