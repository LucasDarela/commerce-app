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

  return (
    <div className="mt-8">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Ajuste Manual de Estoque</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Corrija ou ajuste as quantidades de produtos manualmente (balanço,
            perdas, etc).
          </p>
        </div>
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleOpenHistory}>
              Ver Histórico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Ajustes</DialogTitle>
            </DialogHeader>
            {historyLoading ? (
              <p>Carregando histórico...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Estoque Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length > 0 ? (
                    history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{h.username}</TableCell>
                        <TableCell>{h.product_name}</TableCell>
                        <TableCell>{h.reason}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            h.difference > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {h.difference > 0 ? `+${h.difference}` : h.difference}
                        </TableCell>
                        <TableCell className="text-right">
                          {h.new_stock}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-4"
                      >
                        Nenhum histórico encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Produto</Label>
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
                      ? `${selectedProduct.name} (Atual: ${selectedProduct.stock || 0})`
                      : "Buscar produto..."}
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
                    placeholder="Digite para buscar..."
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
                          {p.name} (Atual: {p.stock || 0})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 flex flex-col justify-end">
            <Label>Nova Quantidade</Label>
            <Input
              type="number"
              placeholder="Ex: 50"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Motivo do Ajuste</Label>
          <Input
            placeholder="Ex: Contagem de balanço, perda por validade, etc..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAdjustStock}
          disabled={
            loading || !selectedProductId || !newStock || !reason.trim()
          }
          className="w-full md:w-auto"
        >
          {loading ? "Ajustando..." : "Salvar Ajuste"}
        </Button>
      </div>
    </div>
  );
}
