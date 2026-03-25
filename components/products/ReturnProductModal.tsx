"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { ProductItem } from "@/components/types/products";

interface ReturnProductModalProps {
  open: boolean;
  onClose: () => void;
  items: ProductItem[] | null;
  orderId: string;
  companyId: string;
  createdBy: string;
  onSuccess: () => void;
}

export function ReturnProductModal({
  open,
  onClose,
  items,
  orderId,
  companyId,
  createdBy,
  onSuccess,
}: ReturnProductModalProps) {
  const supabase = createBrowserSupabaseClient();   
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedProductIds([]);
      setReturnQuantities({});
    }
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);

    try {
      if (!companyId || !orderId) {
        throw new Error("Dados da empresa ou do pedido não encontrados.");
      }

      const productsToReturn = selectedProductIds
        .map((productId) => {
          const originalItem = (items ?? []).find((item) => item.id === productId);
          const requestedQuantity = returnQuantities[productId] ?? 0;
          const maxQuantity = Number(originalItem?.quantity ?? 0);

          return {
            productId,
            quantity: Math.min(Math.max(requestedQuantity, 0), maxQuantity),
          };
        })
        .filter((item) => item.quantity > 0);

      if (productsToReturn.length === 0) {
        toast.info("Nenhum produto selecionado para retorno.");
        onClose();
        return;
      }

      let totalDiscount = 0;

      for (const { productId, quantity } of productsToReturn) {
        const { data: orderItem, error: orderItemError } = await supabase
          .from("order_items")
          .select("price, order_id, product_id")
          .eq("order_id", orderId)
          .eq("product_id", productId)
          .maybeSingle();

        if (orderItemError || !orderItem) {
          console.error("Erro ao buscar preço da venda:", orderItemError);
          throw new Error("Erro ao buscar preço da venda.");
        }

        const unitPrice = Number(orderItem.price ?? 0);
        totalDiscount += unitPrice * quantity;

        const movementRes = await fetch("/api/stock-movements/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            productId,
            quantity,
            type: "return",
            reason: "Product return after delivery",
            noteId: orderId,
            createdBy,
          }),
        });

        if (!movementRes.ok) {
          const movementData = await movementRes.json().catch(() => null);
          console.error("Erro ao registrar movimentação:", movementData);
          throw new Error("Erro ao registrar retorno no estoque.");
        }
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, total, company_id")
        .eq("id", orderId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (orderError || !orderData) {
        console.error("Erro ao buscar total da venda:", orderError);
        throw new Error("Erro ao buscar total da venda.");
      }

      const currentTotal = Number(orderData.total ?? 0);
      const newTotal = Math.max(0, currentTotal - totalDiscount);

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ total: newTotal })
        .eq("id", orderId)
        .eq("company_id", companyId);

      if (updateOrderError) {
        console.error("Erro ao atualizar o total da venda:", updateOrderError);
        throw new Error("Erro ao atualizar o total da venda.");
      }

      toast.success("Produtos retornados e total da venda atualizado!");
      onClose();
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao processar o retorno de produtos.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId),
    );

    setReturnQuantities((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[productId] = 1;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retornar Produtos Vendidos</DialogTitle>
        </DialogHeader>

        {(items ?? []).map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 mb-2"
          >
            <Checkbox
              id={`product-${item.id}`}
              checked={selectedProductIds.includes(item.id)}
              onCheckedChange={(checked) =>
                handleCheckboxChange(item.id, checked as boolean)
              }
            />
            <label htmlFor={`product-${item.id}`} className="flex-1 text-sm">
              {item.name} ({item.quantity} vendidos)
            </label>
            <Input
              type="number"
              min={1}
              max={item.quantity}
              disabled={!selectedProductIds.includes(item.id)}
              value={returnQuantities[item.id] ?? ""}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const clamped = Math.max(1, Math.min(raw, item.quantity));
                setReturnQuantities((prev) => ({
                  ...prev,
                  [item.id]: Number.isNaN(clamped) ? 1 : clamped,
                }));
              }}
              className="w-16 text-sm"
            />
          </div>
        ))}

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Salvando..." : "Confirmar Retorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}