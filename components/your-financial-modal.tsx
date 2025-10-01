"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  financial: FinancialRecord;
  onSuccess: () => void;
}

interface FinancialRecord {
  id: string;
  amount: number;
  status: "Unpaid" | "Paid" | "Partial";
  payment_method: "Pix" | "Cartao" | "Dinheiro" | "Boleto";
}

export function YourFinancialRecords({
  open,
  onClose,
  financial,
  onSuccess,
}: PaymentModalProps) {
  const [partialValue, setPartialValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "Pix" | "Dinheiro" | "Boleto" | "Cartao" | ""
  >("");
  const [loading, setLoading] = useState(false);

  const mapPaymentMethod = (
    value: "Pix" | "Dinheiro" | "Boleto" | "Cartao",
  ): "Pix" | "Dinheiro" | "Boleto" | "Cartao" => value;

  useEffect(() => {
    if (financial?.payment_method) {
      setPaymentMethod(mapPaymentMethod(financial.payment_method));
    }
  }, [financial?.payment_method]);

  if (!financial) return null;

  // ✅ Função para pagamento integral
  async function handleFullPayment() {
    setLoading(true);
    try {
      const res = await fetch("/api/update-financial-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_id: financial.id,
          payment_method: paymentMethod,
          total_payed: financial.amount, // não precisa salvar esse campo no banco se for só "status"
        }),
      });

      if (!res.ok) throw new Error("Erro ao pagar nota.");
      toast.success("Pagamento registrado.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Erro ao pagar nota");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Função para pagamento parcial
  async function handlePartialPayment() {
    const parsedValue = parseFloat(partialValue.replace(",", "."));

    console.log("Enviando:", {
      financial_id: financial.id,
      payment_method: paymentMethod,
      total_payed: parsedValue,
    });

    if (!partialValue || isNaN(parsedValue)) {
      toast.error("Informe um valor válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/update-payment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_id: financial.id,
          payment_method: paymentMethod,
          total_payed: parsedValue,
        }),
      });

      if (!res.ok) throw new Error("Erro ao registrar pagamento parcial.");
      toast.success("Pagamento parcial registrado.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Erro ao pagar nota");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento da Nota</DialogTitle>
          <DialogDescription>
            Total da nota:{" "}
            <strong>R$ {financial.amount?.toFixed(2) ?? "0,00"}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* ✅ Seletor de método de pagamento */}
        <div className="space-y-2">
          <Label className="mb-2">Método de Pagamento</Label>
          <Select
            value={paymentMethod}
            onValueChange={(val) =>
              setPaymentMethod(
                val as "Pix" | "Dinheiro" | "Boleto" | "Cartao" | "",
              )
            }
          >
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
          <Button
            disabled={loading}
            onClick={handleFullPayment}
            className="w-full"
          >
            Pagar Nota
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
