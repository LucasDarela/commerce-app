"use client";

import { useState } from "react";
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
import { supabase } from "@/lib/supabase";
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);

    try {
      const productsToReturn = selectedProductIds
        .map((productId) => ({
          productId,
          quantity: returnQuantities[productId] ?? 0,
        }))
        .filter((item) => item.quantity > 0);

      // ✅ Se não houver nenhum produto selecionado → apenas fecha o modal
      if (productsToReturn.length === 0) {
        toast.info("Nenhum produto selecionado para retorno.");
        onClose();
        return;
      }

      let totalDiscount = 0;

      for (const { productId, quantity } of productsToReturn) {
        const { data: orderItem, error: orderItemError } = await supabase
          .from("order_items")
          .select("price")
          .eq("order_id", orderId)
          .eq("product_id", productId)
          .single();

        if (orderItemError || !orderItem) {
          console.error("Erro ao buscar preço da venda:", orderItemError);
          throw new Error("Erro ao buscar preço da venda.");
        }

        const unitPrice = Number(orderItem.price);
        totalDiscount += unitPrice * quantity;

        await fetch("/api/stock-movements/register", {
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
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        console.error("Erro ao buscar total da venda:", orderError);
        throw new Error("Erro ao buscar total da venda.");
      }

      const newTotal = Number(orderData.total) - totalDiscount;

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ total: newTotal })
        .eq("id", orderId);

      if (updateOrderError) {
        console.error("Erro ao atualizar o total da venda:", updateOrderError);
        throw new Error("Erro ao atualizar o total da venda.");
      }

      toast.success("Produtos retornados e total da venda atualizado!");
      onClose();
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar o retorno de produtos.");
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
              onChange={(e) =>
                setReturnQuantities((prev) => ({
                  ...prev,
                  [item.id]: Number(e.target.value),
                }))
              }
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
