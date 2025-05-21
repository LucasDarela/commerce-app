"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  console.log("🔁 IDs para retorno:", selectedItems)
  const handleConfirmReturn = async () => {
    if (selectedItems.length === 0) return
    const { error } = await supabase
      .from("equipment_loans")
      .update({
        status: "returned",
        return_date: new Date().toISOString().split("T")[0],
      })
      .in("id", selectedItems)

    if (!error) {
      toast.success("Itens retornados com sucesso!")
      onOpenChange(false)
      setSelectedItems([])
      onReturnSuccess()
    } else {
      toast.error("Erro ao retornar itens")
    }
  }

  return (
    console.log("🔍 Itens recebidos no modal:", items),
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Itens para Retorno</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
        {(items ?? []).map((item) => (
            <div key={item.loanId} className="flex items-center space-x-2">
            <Checkbox
                id={item.loanId}
                checked={selectedItems.includes(item.loanId)}
                onCheckedChange={(checked) => {
                setSelectedItems((prev) =>
                    checked
                    ? [...prev, item.loanId]
                    : prev.filter((id) => id !== item.loanId)
                )
                }}
            />
            <label htmlFor={item.loanId} className="text-sm">
                {item.equipmentName} - {item.quantity}
            </label>
            </div>
        ))}
        </div>
        <DialogFooter>
        <Button
            onClick={async () => {
                if (selectedItems.length === 0) {
                toast.warning("Selecione pelo menos um item para retornar.")
                return
                }

                console.log("🔁 IDs para retorno:", selectedItems)

                const { error } = await supabase
                .from("equipment_loans")
                .update({
                    status: "returned",
                    return_date: new Date().toISOString().split("T")[0],
                })
                .in("id", selectedItems)

                if (!error) {
                toast.success("Itens retornados com sucesso!")
                onOpenChange(false)
                setSelectedItems([])
                onReturnSuccess()
                } else {
                toast.error("Erro ao retornar itens")
                console.error("❌ Supabase:", error)
                }
            }}
            >
            Confirmar Retorno
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}