"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import LoanEquipmentPage from "@/components/equipment-loan/equipment-loan-page"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PlusCircle, Trash2 } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"




export function LoanEquipmentModal({
  open,
  onOpenChange,
  onLoanSaved,
  initialCustomer,
  initialItems,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onLoanSaved: () => void
  initialCustomer?: { id: string; name: string }
  initialItems?: { equipment_id: string; name: string; quantity: number }[]
}) {

  const { companyId } = useAuthenticatedCompany()
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [searchCustomer, setSearchCustomer] = useState("")
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [loanItems, setLoanItems] = useState<any[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("")
  const [searchEquipment, setSearchEquipment] = useState("")
  const [showEquipments, setShowEquipments] = useState(false)
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split("T")[0])
  const [noteNumber, setNoteNumber] = useState(() => Date.now().toString().slice(-6))

  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null)


  const fetchEquipments = async () => {
    if (!companyId) return
    const { data, error } = await supabase
      .from("equipments")
      .select("id, name")
      .eq("company_id", companyId)

    if (error) {
      toast.error("Erro ao buscar equipamentos")
    } else {
      setEquipmentList(data || [])
    }
  }

  const handleAddItem = () => {
    if (!selectedEquipmentId) return
    const equipment = equipmentList.find(e => e.id === selectedEquipmentId)
    if (equipment) {
        setLoanItems([...loanItems, { equipment_id: equipment.id, name: equipment.name, quantity: 1 }])
      setSelectedEquipmentId("")
    }
  }

  const handleRemoveItem = (index: number) => {
    setLoanItems(loanItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!companyId || !selectedCustomer || loanItems.length === 0) {
      toast.error("Preencha todos os campos")
      return
    }
  
    const inserts = loanItems.map((item) => ({
      company_id: companyId,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      equipment_id: item.equipment_id,
      loan_date: noteDate,
      note_number: noteNumber,
      note_date: noteDate,
      quantity: item.quantity,
      status: "active",
    }))
  
    toast.loading("Salvando empréstimo...")
    const { error } = await supabase.from("equipment_loans").insert(inserts)
    toast.dismiss()
  
    if (error) {
      console.error(error)
      toast.error("Erro ao salvar empréstimo")
    } else {
      toast.success("Empréstimo registrado com sucesso")
  
      // Reset completo
      setLoanItems([])
      setSearchCustomer("")
      setSelectedCustomer(null)
      setSelectedEquipmentId("")
      setSearchEquipment("")
      setNoteNumber(Date.now().toString().slice(-6)) // Atualiza número da nota
      onLoanSaved?.()
      onOpenChange(false)
    }
  }

  useEffect(() => {
    fetchEquipments()
  }, [companyId])

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
  
      if (error) {
        toast.error("Erro ao carregar clientes.")
        console.error(error)
      } else {
        setCustomers(data || [])
      }
    }
  
    if (companyId) fetchCustomers()
  }, [companyId])

  const handleSelectCustomer = (customer: { id: string; name: string }) => {
    setSelectedCustomer(customer)
    setSearchCustomer(customer.name)
    setShowCustomers(false)
  }

  const filteredEquipments = searchEquipment.trim()
  ? equipmentList.filter((eq) =>
      eq.name.toLowerCase().includes(searchEquipment.toLowerCase())
    )
  : []

  useEffect(() => {
    if (open) {

      if (initialCustomer) {
        setSelectedCustomer(initialCustomer)
        setSearchCustomer(initialCustomer.name)
      }
  
      if (initialItems) {
        setLoanItems(initialItems)
      }
  
    } else {

      setSelectedCustomer(null)
      setSearchCustomer("")
      setLoanItems([])
      setSelectedEquipmentId("")
      setSearchEquipment("")
      setNoteNumber(Date.now().toString().slice(-6)) 
    }
  }, [open, initialCustomer, initialItems])

  // async function fetchEquipmentsForOrderProducts(productsText: string) {
  //   const parsed = productsText.split(",").map(entry => {
  //     const match = entry.trim().match(/^(.+?) \((\d+)x\)$/)
  //     if (!match) return null
  //     const [, name, quantity] = match
  //     return { name: name.trim(), quantity: Number(quantity) }
  //   }).filter(Boolean)
  
  //   const productNames = parsed.map(p => p!.name)
  
  //   const { data: productsData, error } = await supabase
  //     .from("products")
  //     .select("id, name")
  //     .in("name", productNames)
  
  //   if (error) {
  //     console.error("Erro ao buscar produtos:", error)
  //     return []
  //   }
  
  //   const equipments: any[] = []
  
  //   for (const parsedProduct of parsed) {
  //     const product = productsData.find(p => p.name === parsedProduct!.name)
  //     if (!product) continue
  
  //     const { data: linkedEquipments } = await supabase
  //       .from("product_loans")
  //       .select("equipment_id, quantity, equipment:equipment_id(name)")
  //       .eq("product_id", product.id)
  
  //     linkedEquipments?.forEach(item => {
  //       equipments.push({
  //         equipment_id: item.equipment_id,
  //         name: item.equipment?.name,
  //         quantity: item.quantity * parsedProduct!.quantity
  //       })
  //     })
  //   }
  
  //   return equipments
  // }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-screen overflow-y-auto sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="mt-2 font-bold text-xl">Registrar Empréstimo de Equipamento</DialogTitle>
        </DialogHeader>
        <div className="max-w-3xl mx-auto p-4">
          <div className="space-y-4 ">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Data da Nota</label>
                  <Input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Número da Nota</label>
                  <Input
                    type="text"
                    value={noteNumber}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
            </div>
            <div className="relative">
            <label className="text-sm text-muted-foreground">Nome do Cliente</label>
                <Input
                    placeholder="Buscar cliente..."
                    value={searchCustomer}
                    onChange={(e) => {
                    setSearchCustomer(e.target.value)
                    setShowCustomers(true)
                    }}
                />

                {showCustomers && searchCustomer.trim() && (
                    <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-white">
                    {customers
                        .filter((customer) =>
                        customer.name.toLowerCase().includes(searchCustomer.toLowerCase())
                        )
                        .map((customer) => (
                        <div
                            key={customer.id}
                            className="p-2 hover:bg-accent cursor-pointer"
                            onClick={() => handleSelectCustomer(customer)}
                        >
                            {customer.name}
                        </div>
                        ))}
                    </div>
                )}

              <p className="text-sm text-muted-foreground mt-2">
                Cliente selecionado:{" "}
                <strong>{selectedCustomer?.name || "Nenhum"}</strong>
              </p>
            </div>
            <div className="flex gap-2">
            <div className="relative w-full">
            <Input
              type="text"
              placeholder="Digite o nome do equipamento"
              value={searchEquipment}
              onChange={(e) => {
                setSearchEquipment(e.target.value)
                setShowEquipments(true)
              }}
              onBlur={() => setTimeout(() => setShowEquipments(false), 200)}
            />
            {showEquipments && filteredEquipments.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md bg-white max-h-40 overflow-y-auto">
                {filteredEquipments.map((equipment) => (
                  <div
                    key={equipment.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedEquipmentId(equipment.id)
                      setSearchEquipment(equipment.name)
                      setShowEquipments(false)
                    }}
                  >
                    {equipment.name}
                  </div>
                ))}
              </div>
            )}
            </div>
              <Button onClick={handleAddItem}>
              <PlusCircle className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            {loanItems.length > 0 && (
              <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Equipamento</TableHead>
        <TableHead>Quantidade</TableHead>
        <TableHead>Ações</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {loanItems.map((item, index) => (
        <TableRow key={index}>
          <TableCell>{item.name}</TableCell>
          <TableCell>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => {
                const newQuantity = parseInt(e.target.value, 10) || 1
                setLoanItems((prev) => {
                  const updated = [...prev]
                  updated[index].quantity = newQuantity
                  return updated
                })
              }}
              className="w-20"
            />
          </TableCell>
          <TableCell>
            <Button variant="ghost" onClick={() => handleRemoveItem(index)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
            )}

            <Button onClick={handleSubmit} className="w-full mt-4">Salvar Empréstimo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
