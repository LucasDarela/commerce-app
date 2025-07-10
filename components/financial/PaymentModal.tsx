import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FinancialRecord } from "@/components/types/financial";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Props = {
  order: FinancialRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
};

export function FinancialPaymentModal({
  order,
  open,
  onClose,
  onSuccess,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Nota</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p>
            Deseja marcar como <strong>paga</strong> a nota de {order.supplier}{" "}
            no valor de <strong>R$ {Number(order.amount).toFixed(2)}</strong>?
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from("financial_records")
                  .update({ status: "Paid" })
                  .eq("id", order.id);

                if (error) {
                  toast.error("Erro ao pagar nota.");
                  return;
                }

                toast.success("Nota paga com sucesso!");
                onSuccess(order.id);
                onClose();
              }}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
