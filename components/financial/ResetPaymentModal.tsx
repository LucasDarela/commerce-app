import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { CombinedRecord } from "./types";

type Props = {
  order: CombinedRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
};

export function ResetFinancialPaymentModal({
  order,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const handleReset = async () => {
    if (!order) return;
    setLoading(true);

    try {
      const isOrder = order.source === "order";
      const table = isOrder ? "orders" : "financial_records";
      
      const payload = isOrder 
        ? { payment_status: "Unpaid", total_payed: 0 }
        : { status: "Unpaid", total_payed: 0 };

      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", order.id);

      if (error) throw error;

      toast.success("Pagamento resetado com sucesso!");
      onSuccess(order.id);
      onClose();
    } catch (err: any) {
      toast.error("Erro ao resetar pagamento", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar Pagamento</DialogTitle>
          <DialogDescription>
            A nota atual está marcada como paga. Deseja zerar o pagamento e voltar o status para pendente?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={loading}>
            {loading ? "Resetando..." : "Sim, zerar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
