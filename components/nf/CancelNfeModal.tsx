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
      if (!reason.trim())
        return toast.error("Informe o motivo do cancelamento.");

      setLoading(true);

      // ✅ Chamar sua API interna, não a Focus diretamente
      const res = await fetch("/api/nfe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refId, motivo: reason, companyId }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        data = { mensagem: text || "Resposta inválida do servidor" };
      }

      if (!res.ok) {
        const errorMessage =
          data?.mensagem ||
          data?.error ||
          data?.message ||
          "Erro ao cancelar NF-e.";
        throw new Error(errorMessage);
      }

      toast.success(
        data?.message || data?.mensagem || "NF-e cancelada com sucesso!",
      );
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
