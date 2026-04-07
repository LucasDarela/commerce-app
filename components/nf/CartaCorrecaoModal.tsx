"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CartaCorrecaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refId: string;
  companyId: string;
  invoiceNumero?: string | number | null;
}

export function CartaCorrecaoModal({
  open,
  onOpenChange,
  refId,
  companyId,
  invoiceNumero,
}: CartaCorrecaoModalProps) {
  const [correcao, setCorrecao] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    status: string;
    mensagem_sefaz: string | null;
    caminho_pdf: string | null;
    numero_carta: number | null;
  } | null>(null);

  const charCount = correcao.trim().length;
  const isValid = charCount >= 15 && charCount <= 1000;

  const handleEnviar = async () => {
    if (loading) return;

    if (!isValid) {
      toast.error("A correção deve ter entre 15 e 1000 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/nfe/carta-correcao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refId, correcao, companyId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || data?.mensagem_sefaz || "Erro ao enviar Carta de Correção.",
        );
      }

      setResultado({
        status: data.status,
        mensagem_sefaz: data.mensagem_sefaz,
        caminho_pdf: data.caminho_pdf,
        numero_carta: data.numero_carta_correcao,
      });
      toast.success("Carta de Correção enviada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar Carta de Correção.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setCorrecao("");
    setResultado(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Carta de Correção Eletrônica</DialogTitle>
          <DialogDescription>
            {invoiceNumero ? `NF-e nº ${invoiceNumero}` : "Descreva o erro que precisa ser corrigido."}{" "}
            Não é possível corrigir: valores de impostos, dados de remetente/destinatário ou data de emissão.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status SEFAZ:</span>
              <Badge variant={resultado.status === "autorizado" ? "default" : "destructive"}>
                {resultado.status === "autorizado" ? "✓ Autorizado" : resultado.status}
              </Badge>
              {resultado.numero_carta && (
                <span className="text-xs text-muted-foreground">CCe Nº {resultado.numero_carta}</span>
              )}
            </div>

            {resultado.mensagem_sefaz && (
              <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                {resultado.mensagem_sefaz}
              </p>
            )}

            {resultado.caminho_pdf && (
              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <a
                  href={`https://api.focusnfe.com.br${resultado.caminho_pdf}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Baixar PDF da Carta de Correção
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição da Correção</label>
              <Textarea
                placeholder="Descreva o que precisa ser corrigido na nota fiscal (mínimo 15 caracteres)..."
                value={correcao}
                onChange={(e) => setCorrecao(e.target.value)}
                disabled={loading}
                rows={5}
                maxLength={1000}
                className="resize-none"
              />
              <div className={`text-xs text-right ${charCount < 15 ? "text-destructive" : charCount > 900 ? "text-amber-500" : "text-muted-foreground"}`}>
                {charCount}/1000 caracteres {charCount < 15 && `(mínimo ${15 - charCount} restantes)`}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {resultado ? "Fechar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button onClick={handleEnviar} disabled={loading || !isValid}>
              {loading ? "Enviando..." : "Enviar Carta de Correção"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
