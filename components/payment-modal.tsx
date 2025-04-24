// ✅ Modal de Pagamento (com melhorias e integração completa)

"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

// ✅ Tipagem da venda
interface Order {
  id: string;
  total: number;
  payment_status: "Pendente" | "Pago";
  payment_method: "Pix" | "Dinheiro" | "Boleto" | "Cartao";
  total_payed?: number;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onSuccess: () => void;
}

export function PaymentModal({ open, onClose, order, onSuccess }: PaymentModalProps) {
    const [partialValue, setPartialValue] = useState("")
    const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Dinheiro" | "Boleto" | "Cartao" | "">("")
    const [loading, setLoading] = useState(false)
  
    // ✅ Atualiza o método de pagamento quando a venda é carregada
    useEffect(() => {
      if (order?.payment_method) {
        setPaymentMethod(order.payment_method)
      }
    }, [order])
  
    // ✅ Garante que só renderiza se o pedido estiver disponível
    if (!order) return null

  // ✅ Função para pagamento integral
  async function handleFullPayment() {
    setLoading(true)
    try {
      const res = await fetch("/api/update-payment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: paymentMethod,
          total_payed: order.total,
        }),
      })

      if (!res.ok) throw new Error("Erro ao pagar nota.")
      toast.success("Pagamento integral registrado.")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error("Erro ao pagar nota")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Função para pagamento parcial
  async function handlePartialPayment() {
    const parsedValue = parseFloat(partialValue.replace(",", "."))
  
    console.log("Enviando:", {
      order_id: order.id,
      payment_method: paymentMethod,
      total_payed: parsedValue,
    })
  
    if (!partialValue || isNaN(parsedValue)) {
      toast.error("Informe um valor válido.")
      return
    }
  
    setLoading(true)
    try {
      const res = await fetch("/api/update-payment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: paymentMethod,
          total_payed: parsedValue,
        }),
      })
  
      if (!res.ok) throw new Error("Erro ao registrar pagamento parcial.")
      toast.success("Pagamento parcial registrado.")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error("Erro ao pagar nota")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento da Nota</DialogTitle>
          <DialogDescription>
  Total da nota: <strong>R$ {order.total?.toFixed(2) ?? "0,00"}</strong>
</DialogDescription>
        </DialogHeader>

        {/* ✅ Seletor de método de pagamento */}
        <div className="space-y-2">
          <Label  className="mb-2">Método de Pagamento</Label>
          <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as "Pix" | "Dinheiro" | "Boleto" | "Cartao" | "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pix">Pix</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
              <SelectItem value="Cartao">Cartão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-4">
          <Button disabled={loading} onClick={handleFullPayment} className="w-full">
            Receber Pagamento Integral
          </Button>

            <Input
              type="number"
              placeholder="Valor parcial"
              value={partialValue}
              onChange={(e) => setPartialValue(e.target.value)}
            />

            <Button disabled={loading} onClick={handlePartialPayment}>
              Receber Parcial
            </Button>

        </div>
      </DialogContent>
    </Dialog>
  )
}