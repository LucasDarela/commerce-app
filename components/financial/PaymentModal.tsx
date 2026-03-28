"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FinancialRecord } from "@/components/types/financial";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

type Props = {
  order: FinancialRecord;
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
};

export function FinancialPaymentModal({
  order,
  companyId,
  open,
  onClose,
  onSuccess,
}: Props) {
  const supabase = createBrowserSupabaseClient();     
  const [loading, setLoading] = useState(false);

  const handleConfirmPayment = async () => {
    if (!order?.id) {
      toast.error("Registro financeiro inválido.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("financial_records")
        .update({ status: "Paid" })
        .eq("id", order.id)
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao pagar nota:", error);
        toast.error("Erro ao pagar nota.");
        return;
      }

      toast.success("Nota paga com sucesso!");
      onSuccess(order.id);
      onClose();
    } catch (error) {
      console.error("Erro inesperado ao pagar nota:", error);
      toast.error("Erro inesperado ao pagar nota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Nota</DialogTitle>
          <DialogDescription>
            Confirme o pagamento da nota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p>
            Deseja marcar como <strong>paga</strong> a nota de {order.supplier} no
            valor de <strong>R$ {Number(order.amount).toFixed(2)}</strong>?
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>

            <Button onClick={handleConfirmPayment} disabled={loading}>
              {loading ? "Confirmando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}