"use client";

import { useState } from "react";
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
    if (loading) return;

    if (!reason.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    if (!refId || !companyId) {
      toast.error("Dados inválidos para cancelamento.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/nfe/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: refId,
          motivo: reason.trim(),
          companyId,
        }),
      });

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        // fallback seguro
      }

      if (!res.ok) {
        const message =
          data?.mensagem ||
          data?.error ||
          data?.message ||
          "Erro ao cancelar NF-e.";
        throw new Error(message);
      }

      toast.success(
        data?.message || data?.mensagem || "NF-e cancelada com sucesso!",
      );

      // ✅ melhor que reload (evita quebrar estado do app)
      onOpenChange(false);

      // 👉 aqui você pode depois disparar refetch ao invés de reload
      // ex: onSuccess()

    } catch (err: any) {
      console.error("Erro ao cancelar NF-e:", err);
      toast.error(err.message || "Erro ao cancelar NF-e.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return; // bloqueia fechar durante request
        onOpenChange(nextOpen);
      }}
    >
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
            disabled={loading}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
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