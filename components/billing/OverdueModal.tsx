"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OverdueItem } from "@/components/billing/types";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy");
  } catch {
    const safe = iso.split("T")[0] || iso;
    return safe.split("-").reverse().join("/") || "—";
  }
};

const fmtMoney = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

type Props = {
  open: boolean;
  items: OverdueItem[];
  onClose: () => void;
  canOverride?: boolean;
  onProceed?: () => void;
};

export function OverdueModal({
  open,
  items,
  onClose,
  canOverride,
  onProceed,
}: Props) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cliente com boletos vencidos
          </DialogTitle>
          <DialogDescription>
            Este cliente possui {items.length} boleto(s) vencido(s). Verifique
            antes de seguir com a venda.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-2">
          <div className="space-y-3 mt-2">
            {items.map((it) => (
              <div
                key={it.order_id}
                className="rounded-md border p-3 text-sm flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    Pedido:{" "}
                    <span className="font-mono">
                      {it.note_number
                        ? `${it.note_number}`
                        : it.order_id?.slice(0, 8)}
                    </span>
                  </div>
                  <div>Vencimento: {fmtDate(it.due_date)}</div>
                  <div>Valor: {fmtMoney(it.total)}</div>
                </div>
                <Badge variant="secondary">
                  {it.payment_status ?? "Unpaid"}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button onClick={onClose}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
