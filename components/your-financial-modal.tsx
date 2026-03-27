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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { FinancialRecord } from "@/components/financial/schema";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  financial: FinancialRecord;
  onSuccess: () => void;
}

type PaymentMethod = "Pix" | "Dinheiro" | "Boleto" | "Cartao";

export function YourFinancialRecords({
  open,
  onClose,
  financial,
  onSuccess,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (financial?.payment_method) {
      setPaymentMethod(financial.payment_method);
    } else {
      setPaymentMethod("Pix");
    }
  }, [financial]);

  if (!financial) return null;

  async function handleFullPayment() {
    setLoading(true);

    try {
      const res = await fetch("/api/update-financial-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_id: financial.id,
          payment_method: paymentMethod || "Pix",
          total_payed: financial.amount,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao pagar nota.");
      }

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento da Nota</DialogTitle>
          <DialogDescription>
            Total da nota:{" "}
            <strong>R$ {Number(financial.amount ?? 0).toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="mb-2">Método de Pagamento</Label>
          <Select
            value={paymentMethod}
            onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
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