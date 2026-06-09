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
import type { FinancialRecord } from "@/components/financial/schema";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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
  const [editValue, setEditValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [loading, setLoading] = useState(false);
  const [isEditingPaidValue, setIsEditingPaidValue] = useState(false);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (financial?.payment_method) {
      setPaymentMethod(financial.payment_method as PaymentMethod);
    }

    setEditValue(
      typeof financial?.total_payed === "number"
        ? financial.total_payed.toFixed(2).replace(".", ",")
        : "0,00"
    );

    setIsEditingPaidValue(false);
  }, [financial, open]);

  if (!financial) return null;

  function formatCurrencyBRL(value: number) {
    return value.toFixed(2).replace(".", ",");
  }

  function parseCurrencyToNumber(value: string) {
    if (!value) return NaN;
    const sanitized = value.trim();
    if (sanitized.includes(",")) {
      return Number(sanitized.replace(/\./g, "").replace(",", "."));
    }
    return Number(sanitized);
  }

  async function handleFullPayment() {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          payment_method: paymentMethod || "Pix",
          total_payed: Number(financial.amount),
          status: "Paid",
        })
        .eq("id", financial.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Pagamento integral registrado.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Erro ao pagar nota");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditPaidValue() {
    const parsedValue = parseCurrencyToNumber(editValue);

    if (isNaN(parsedValue) || parsedValue < 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const already = financial.total_payed ?? 0;

    if (parsedValue < already) {
      const ok = confirm(
        `Você está reduzindo o valor já pago de R$ ${formatCurrencyBRL(
          already
        )} para R$ ${formatCurrencyBRL(parsedValue)}. Deseja continuar?`
      );
      if (!ok) return;
    }

    setLoading(true);

    const isFullyPaid = parsedValue >= Number(financial.amount) - 0.01;
    const newStatus = isFullyPaid ? "Paid" : "Unpaid";

    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          payment_method: paymentMethod || "Pix",
          total_payed: parsedValue,
          status: newStatus,
        })
        .eq("id", financial.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Valor pago atualizado com sucesso.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Erro ao atualizar pagamento.");
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
            <strong className="font-black">
              R$ {formatCurrencyBRL(Number(financial.amount ?? 0))}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 items-center">
          <Label className="text-muted-foreground whitespace-nowrap">
            Método de Pagamento:
          </Label>

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

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Já pago</span>
              <strong className="font-black text-green-600">
                R$ {formatCurrencyBRL(Number(financial.total_payed ?? 0))}
              </strong>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditingPaidValue((prev) => !prev)}
              disabled={loading}
            >
              {isEditingPaidValue ? "Cancelar" : "Editar"}
            </Button>
          </div>

          {isEditingPaidValue && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <Label className="text-muted-foreground">
                Corrigir valor já pago
              </Label>

              <div className="flex gap-3">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor pago"
                  value={editValue}
                  onChange={(e) =>
                    setEditValue(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                />

                <Button disabled={loading} onClick={handleEditPaidValue}>
                  Salvar Edição
                </Button>
              </div>
            </div>
          )}

          <div className="flex text-center justify-center">
            <p className="text-muted-foreground">ou</p>
          </div>

          <div>
            <Button
              disabled={loading}
              onClick={handleFullPayment}
              className="w-full bg-green-600 hover:bg-green-700 font-bold text-white"
            >
              Registrar Pagamento Integral
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}