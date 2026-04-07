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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface InutilizacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  // Pré-preenchidos a partir da nota selecionada
  serie?: string | number | null;
  numero?: string | number | null;
}

export function InutilizacaoModal({
  open,
  onOpenChange,
  companyId,
  serie: serieProp,
  numero: numeroProp,
}: InutilizacaoModalProps) {
  const [serie, setSerie] = useState(String(serieProp ?? "1"));
  const [numeroInicial, setNumeroInicial] = useState(String(numeroProp ?? ""));
  const [numeroFinal, setNumeroFinal] = useState(String(numeroProp ?? ""));
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    status: string;
    mensagem_sefaz: string | null;
    protocolo_sefaz: string | null;
  } | null>(null);

  const justLen = justificativa.trim().length;
  const isValid =
    !!serie && !!numeroInicial && !!numeroFinal && justLen >= 15;

  const handleEnviar = async () => {
    if (loading || !isValid) return;
    setLoading(true);

    try {
      const res = await fetch("/api/nfe/inutilizacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serie,
          numero_inicial: numeroInicial,
          numero_final: numeroFinal,
          justificativa,
          companyId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || data?.mensagem_sefaz || "Erro ao inutilizar nota.",
        );
      }

      setResultado({
        status: data.status,
        mensagem_sefaz: data.mensagem_sefaz,
        protocolo_sefaz: data.protocolo_sefaz,
      });

      toast.success("Inutilização registrada na SEFAZ!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao inutilizar nota.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setResultado(null);
    setJustificativa("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Inutilizar Numeração
          </DialogTitle>
          <DialogDescription>
            Esta operação inutiliza a numeração na SEFAZ e não pode ser revertida.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={resultado.status === "autorizado" ? "default" : "destructive"}>
                {resultado.status === "autorizado" ? "✓ Inutilizado" : resultado.status}
              </Badge>
            </div>

            {resultado.mensagem_sefaz && (
              <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                {resultado.mensagem_sefaz}
              </p>
            )}

            {resultado.protocolo_sefaz && (
              <p className="text-xs text-muted-foreground">
                Protocolo SEFAZ: <span className="font-mono">{resultado.protocolo_sefaz}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Série</label>
                <Input
                  type="number"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  disabled={loading}
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Nº Inicial</label>
                <Input
                  type="number"
                  value={numeroInicial}
                  onChange={(e) => setNumeroInicial(e.target.value)}
                  disabled={loading}
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Nº Final</label>
                <Input
                  type="number"
                  value={numeroFinal}
                  onChange={(e) => setNumeroFinal(e.target.value)}
                  disabled={loading}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Justificativa</label>
              <Textarea
                placeholder="Informe o motivo da inutilização (mínimo 15 caracteres)..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                disabled={loading}
                rows={3}
                className="resize-none"
              />
              <p className={`text-xs text-right ${justLen < 15 ? "text-destructive" : "text-muted-foreground"}`}>
                {justLen} chars {justLen < 15 && `(faltam ${15 - justLen})`}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {resultado ? "Fechar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button
              variant="destructive"
              onClick={handleEnviar}
              disabled={loading || !isValid}
            >
              {loading ? "Inutilizando..." : "Confirmar Inutilização"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
