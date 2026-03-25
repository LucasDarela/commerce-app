"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type EquipmentItem = {
  loanId: string;
  equipmentName: string;
  quantity: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  customerName?: string;
  companyId: string;
  items: EquipmentItem[];
  order?: unknown;
  user?: { id?: string } | null;
  onReturnSuccess: () => void;
  onOpenProductReturnModal: () => void;
};

export function ReturnEquipmentModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  companyId,
  items,
  order,
  user,
  onReturnSuccess,
  onOpenProductReturnModal,
}: Props) {
  const supabase = createBrowserSupabaseClient();       
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const handleConfirmReturn = async () => {
    if (loading) return;

    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!customerId) {
      toast.error("Cliente não identificado.");
      return;
    }

    if (!items?.length) {
      toast.error("Nenhum item disponível para retorno.");
      return;
    }

    if (selectedItems.length === 0) {
      const confirmed = window.confirm(
        "Você não realizou coletas nessa viagem, confirma?",
      );

      if (!confirmed) return;

      toast.success("Viagem registrada sem coletas.");
      onReturnSuccess();
      onOpenProductReturnModal();
      return;
    }

    setLoading(true);

    try {
      const itemById = new Map(items.map((item) => [item.loanId, item]));
      const today = new Date().toISOString().split("T")[0];

      const updates = selectedItems.map(async (loanId) => {
        const original = itemById.get(loanId);

        if (!original) {
          throw new Error(`Item ${loanId} não encontrado.`);
        }

        const requestedQty = quantities[loanId] ?? original.quantity;
        const returnedQty = Math.max(
          1,
          Math.min(original.quantity, requestedQty),
        );
        const remaining = Math.max(0, original.quantity - returnedQty);

        const payload =
          remaining > 0
            ? {
                quantity: remaining,
                status: "active",
                return_date: today,
              }
            : {
                quantity: 0,
                status: "returned",
                return_date: today,
              };

        const { error } = await supabase
          .from("equipment_loans")
          .update(payload)
          .eq("id", loanId)
          .eq("company_id", companyId)
          .eq("customer_id", customerId);

        if (error) {
          throw error;
        }
      });

      await Promise.all(updates);

      toast.success("Retorno registrado com sucesso!");
      onReturnSuccess();
      onOpenProductReturnModal();
    } catch (error) {
      console.error("Erro ao registrar retorno:", error);
      toast.error("Erro ao registrar retorno de um ou mais itens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Itens para Retorno</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {(items ?? []).map((item) => {
            const isSelected = selectedItems.includes(item.loanId);

            return (
              <div key={item.loanId} className="flex items-center space-x-2">
                <Checkbox
                  id={item.loanId}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;

                    setSelectedItems((prev) =>
                      enabled
                        ? [...prev, item.loanId]
                        : prev.filter((id) => id !== item.loanId),
                    );

                    setQuantities((prev) => ({
                      ...prev,
                      [item.loanId]: enabled ? item.quantity : 0,
                    }));
                  }}
                />

                <label htmlFor={item.loanId} className="text-sm flex-1">
                  {item.equipmentName} - emprestado: {item.quantity}
                </label>

                <input
                  type="number"
                  min={1}
                  max={item.quantity}
                  disabled={!isSelected || loading}
                  value={quantities[item.loanId] ?? ""}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    const safeValue = Number.isNaN(parsed)
                      ? 1
                      : Math.max(1, Math.min(item.quantity, parsed));

                    setQuantities((prev) => ({
                      ...prev,
                      [item.loanId]: safeValue,
                    }));
                  }}
                  className="w-16 border rounded px-2 py-1 text-sm"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirmReturn} disabled={loading}>
            {loading ? "Confirmando..." : "Confirmar Retorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}