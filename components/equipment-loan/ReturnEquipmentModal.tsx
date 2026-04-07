"use client";

import { useEffect, useMemo, useState } from "react";
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
  onReturnSuccess: (shouldOpenProductReturnModal: boolean) => void;
  onOpenProductReturnModal: () => void;
};

type GroupedEquipmentItem = {
  equipmentName: string;
  totalQuantity: number;
  loanIds: string[];
  originalItems: EquipmentItem[];
};

function groupItemsByEquipment(items: EquipmentItem[]): GroupedEquipmentItem[] {
  const map = new Map<string, GroupedEquipmentItem>();

  for (const item of items) {
    const existing = map.get(item.equipmentName);

    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.loanIds.push(item.loanId);
      existing.originalItems.push(item);
    } else {
      map.set(item.equipmentName, {
        equipmentName: item.equipmentName,
        totalQuantity: item.quantity,
        loanIds: [item.loanId],
        originalItems: [item],
      });
    }
  }

  return Array.from(map.values());
}

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
  const [quantities, setQuantities] = useState<Record<string, number | "">>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setQuantities({});
    }
  }, [open]);

  const groupedItems = useMemo(() => {
    return groupItemsByEquipment(items ?? []);
  }, [items]);

  const remainingSummary = useMemo(() => {
    return groupedItems
      .map((group) => {
        const isSelected = selectedItems.includes(group.equipmentName);

        const qtyVal = quantities[group.equipmentName];
        const selectedQty = isSelected
          ? (qtyVal === "" ? 0 : (qtyVal ?? group.totalQuantity))
          : 0;

        const remainingQty = Math.max(group.totalQuantity - Number(selectedQty), 0);

        return {
          equipmentName: group.equipmentName,
          remainingQty,
        };
      })
      .filter((item) => item.remainingQty > 0);
  }, [groupedItems, selectedItems, quantities]);

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
      onOpenChange(false);
      onReturnSuccess(true);
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      for (const equipmentName of selectedItems) {
        const group = groupedItems.find((g) => g.equipmentName === equipmentName);

        if (!group) continue;

        const qVal = quantities[equipmentName];
        let remainingToReturn =
          qVal === "" || qVal === undefined ? group.totalQuantity : Number(qVal);

        for (const original of group.originalItems) {
          if (remainingToReturn <= 0) break;

          const returnQty = Math.min(original.quantity, remainingToReturn);
          const remaining = Math.max(0, original.quantity - returnQty);

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
            .eq("id", original.loanId)
            .eq("company_id", companyId)
            .eq("customer_id", customerId);

          if (error) throw error;

          remainingToReturn -= returnQty;
        }
      }

      toast.success("Retorno registrado com sucesso!");
      onOpenChange(false);
      onReturnSuccess(true);
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

        <div className="space-y-4">
          <div className="space-y-2">
            {groupedItems.map((group) => {
              const isSelected = selectedItems.includes(group.equipmentName);

              return (
                <div
                  key={group.equipmentName}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={group.equipmentName}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true;

                      setSelectedItems((prev) =>
                        enabled
                          ? [...prev, group.equipmentName]
                          : prev.filter((name) => name !== group.equipmentName),
                      );

                      setQuantities((prev) => ({
                        ...prev,
                        [group.equipmentName]: enabled ? group.totalQuantity : 0,
                      }));
                    }}
                  />

                  <label htmlFor={group.equipmentName} className="text-sm flex-1">
                    {group.equipmentName} – {group.totalQuantity}
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={group.totalQuantity}
                    disabled={!isSelected || loading}
                    value={
                      isSelected
                        ? (quantities[group.equipmentName] ?? group.totalQuantity)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuantities((prev) => ({
                          ...prev,
                          [group.equipmentName]: "",
                        }));
                        return;
                      }

                      const parsed = parseInt(val, 10);
                      const safeValue = Number.isNaN(parsed)
                        ? ""
                        : Math.min(group.totalQuantity, Math.max(0, parsed));

                      setQuantities((prev) => ({
                        ...prev,
                        [group.equipmentName]: safeValue,
                      }));
                    }}
                    onBlur={(e) => {
                       const val = quantities[group.equipmentName];
                       if (val === "" || val === 0) {
                         setQuantities((prev) => ({
                           ...prev,
                           [group.equipmentName]: 1,
                         }));
                       }
                    }}
                    className="w-16 border rounded px-2 py-1 text-sm"
                  />
                </div>
              );
            })}
          </div>

          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-sm font-medium mb-2">
              Após esta coleta, ficará com o cliente:
            </p>

            {remainingSummary.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {remainingSummary.map((item) => (
                  <li key={item.equipmentName}>
                    {item.equipmentName} – {item.remainingQty}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você recolheu tudo aqui.
              </p>
            )}
          </div>
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