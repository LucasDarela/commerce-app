"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CancelNfeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refId: string;
  companyId: string;
}

export function CancelNfeModal({
  open,
  onOpenChange,
  refId,
  companyId,
}: CancelNfeModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancelNfe = async () => {
    try {
      if (!reason.trim()) {
        toast.error("Informe o motivo do cancelamento.");
        return;
      }

      setLoading(true);

      // 🔹 1. Cancelar na Focus NFe
      const response = await fetch(
        `https://api.focusnfe.com.br/v2/nfe/${refId}/cancelar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_FOCUS_API_KEY}`,
          },
          body: JSON.stringify({ justificativa: reason }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        throw new Error(data.mensagem || "Erro ao cancelar NF-e na Focus.");
      }

      // 🔹 2. Atualizar status no Supabase
      const { error } = await supabase
        .from("invoices")
        .update({ status: "cancelada" })
        .eq("ref", refId)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success("NF-e cancelada com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar NF-e.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar NF-e</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label htmlFor="reason" className="text-sm font-medium">
            Motivo do cancelamento
          </label>
          <Input
            id="reason"
            placeholder="Ex: Nota emitida com dados incorretos"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleCancelNfe} disabled={loading}>
            {loading ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
