"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

type Item = {
  loanId: string
  equipmentName: string
  quantity: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string | null
  customerName?: string
  items: Item[]
  onReturnSuccess: () => void
}

export function ReturnEquipmentModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  items,
  onReturnSuccess,
}: Props) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const handleConfirmReturn = async () => {
    if (selectedItems.length === 0) {
      const confirmed = confirm("Você não realizou coletas nessa viagem, confirma?");
      if (confirmed && customerId) {
        const { error } = await supabase
          .from("equipment_loans")
          .update({
            status: "returned",
            return_date: new Date().toISOString().split("T")[0],
            quantity: 0,
          })
          .eq("customer_id", customerId)
          .eq("status", "delivered"); 
    
        if (error) {
          toast.error("Erro ao atualizar o status dos empréstimos.");
          console.error("❌ Supabase error:", error);
        } else {
          toast.success("Retorno registrado como nenhum item coletado.");
          setSelectedItems([]);
          setQuantities({});
          onOpenChange(false);
          onReturnSuccess();
        }
      }
      return;
    }

    const updates = selectedItems.map((loanId) => ({
      id: loanId,
      quantity: quantities[loanId] ?? 1,
    }))

    try {
      const results = await Promise.all(
        updates.map(({ id, quantity }) =>
          supabase
            .from("equipment_loans")
            .update({
              status: "returned",
              return_date: new Date().toISOString().split("T")[0],
              quantity, // salva a quantidade que foi retornada
            })
            .eq("id", id)
        )
      )

      const hasError = results.some((res) => res.error)
      if (hasError) {
        toast.error("Erro ao retornar um ou mais itens")
        console.error("Erros:", results)
      } else {
        toast.success("Itens retornados com sucesso!")
        setSelectedItems([])
        setQuantities({})
        onOpenChange(false)
        onReturnSuccess()
      }
    } catch (error) {
      toast.error("Erro inesperado ao retornar itens")
      console.error("❌ Erro:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Itens para Retorno</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {(items ?? []).map((item) => {
            const isSelected = selectedItems.includes(item.loanId)
            return (
              <div key={item.loanId} className="flex items-center space-x-2">
                <Checkbox
                  id={item.loanId}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    setSelectedItems((prev) =>
                      checked
                        ? [...prev, item.loanId]
                        : prev.filter((id) => id !== item.loanId)
                    )
                    setQuantities((prev) => ({
                      ...prev,
                      [item.loanId]: checked ? item.quantity : 0,
                    }))
                  }}
                />
                <label htmlFor={item.loanId} className="text-sm flex-1">
                  {item.equipmentName} - emprestado: {item.quantity}
                </label>
                <input
                  type="number"
                  min={1}
                  max={item.quantity}
                  disabled={!isSelected}
                  value={quantities[item.loanId] ?? ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setQuantities((prev) => ({
                      ...prev,
                      [item.loanId]: isNaN(value) ? 1 : value,
                    }))
                  }}
                  className="w-16 border rounded px-2 py-1 text-sm"
                />
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirmReturn}>
            Confirmar Retorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}