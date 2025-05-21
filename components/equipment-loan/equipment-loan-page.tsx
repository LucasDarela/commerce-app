"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconPlus,
  } from "@tabler/icons-react"
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal"
import { ReturnEquipmentModal } from "./ReturnEquipmentModal"

type LoanWithDetails = {
  id: string
  quantity: number
  note_number: string
  note_date: string
  customer_id: string
  customer: { name: string }
  equipment: { name: string }
}

type GroupedByCustomer = {
    customerId: string
    customerName: string
    items: {
      loanId: string
      equipmentName: string
      quantity: number
    }[]
  }

export default function LoanByCustomerPage() {
  const [groupedData, setGroupedData] = useState<GroupedByCustomer[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)


  const fetchData = async () => {
    const { data, error } = await supabase
      .from("equipment_loans")
      .select("id, quantity, note_number, customer_id, customer_name, equipments(name)")
      .neq("status", "returned")
  
    if (!error && data) {
      const grouped: Record<string, GroupedByCustomer> = {}
      for (const loan of data) {
        const customerId = loan.customer_id
        const customerName = loan.customer_name ?? "Desconhecido"
        const equipmentName = loan.equipments?.[0]?.name ?? "Equipamento"
  
        if (!grouped[customerId]) {
          grouped[customerId] = {
            customerId,
            customerName,
            items: [],
          }
        }
  
        grouped[customerId].items.push({
          loanId: loan.id,
          equipmentName,
          quantity: loan.quantity,
        })
      }
  
      setGroupedData(Object.values(grouped))
    }
  }
  useEffect(() => {
    fetchData()
  }, [])

  return (
<div className="w-full px-6 py-4">

    <div className="flex justify-between">
    <h1 className="text-2xl font-bold mb-6">Equipamentos por Cliente</h1>
    <Button onClick={() => setIsLoanModalOpen(true)}>
      Novo Empréstimo
    </Button>

    <LoanEquipmentModal
      open={isLoanModalOpen}
      onOpenChange={setIsLoanModalOpen}
      onLoanSaved={fetchData} 
    />
    </div>

  {groupedData.length === 0 ? (
    <p className="text-muted-foreground">Nenhum empréstimo ativo encontrado.</p>
  ) : (
    <div className="space-y-6">
{groupedData.map((group) => (
  <div key={`customer-${group.customerId}`} className="mb-6">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold text-primary">{group.customerName}</h2>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setSelectedCustomerId(group.customerId)
          setOpenModal(true)
          setSelectedItems([])
        }}
      >
        Retornar Itens
      </Button>
    </div>

    <ul className="list-disc pl-6 text-sm text-muted-foreground mt-2">
      {group.items.map((item, index) => (
        <li key={`${group.customerId}-${item.equipmentName}-${index}`}>
          {item.equipmentName} – {item.quantity}
        </li>
      ))}
    </ul>
  </div>
))}
    </div>
  )}

{openModal && selectedCustomerId && (
  <ReturnEquipmentModal
    open={openModal}
    onOpenChange={setOpenModal}
    customerId={selectedCustomerId}
    items={
      groupedData.find((g) => g.customerId === selectedCustomerId)?.items ?? []
    }
    onReturnSuccess={() => {
      setOpenModal(false)
      setSelectedItems([])
      fetchData()
    }}
  />
)}

{/* <Dialog open={openModal} onOpenChange={setOpenModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Selecionar Itens para Retorno</DialogTitle>
    </DialogHeader>

    <div className="space-y-2">
      {groupedData
        .find((g) => g.customerId === selectedCustomerId)
        ?.items.map((item) => (
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
          if (selectedItems.length === 0) return

          const { error } = await supabase
            .from("equipment_loans")
            .update({ status: "returned", return_date: new Date().toISOString().split("T")[0] })
            .in("id", selectedItems)

          if (!error) {
            toast.success("Itens retornados com sucesso!")
            setOpenModal(false)
            window.location.reload()
          } else {
            toast.error("Erro ao retornar itens")
          }
        }}
      >
        Confirmar Retorno
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog> */}

</div>

  )
}

