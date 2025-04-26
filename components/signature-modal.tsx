"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRef } from "react";

// Importação dinâmica para evitar problemas de SSR
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false })

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onSave: (signatureData: string) => void
}

export function SignatureModal({ open, onSave, onClose }: SignatureModalProps) {
    const sigPadRef = useRef<any>(null);
    const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768)
    }
  }, [])

  const handleClear = () => {
    sigPad?.clear()
  }

  const handleSave = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error("⚠️ Por favor, assine antes de salvar.");
      return;
    }

    const dataUrl = sigPadRef.current?.getCanvas().toDataURL("image/png");
    onSave(dataUrl);
    onClose();
    toast.success("🖊️ Assinatura salva com sucesso!")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isMobile ? "w-full h-full p-4" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Assinar Pedido</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-4">
          {/* Canvas de Assinatura */}
          <SignatureCanvas
            penColor="black"
            canvasProps={{
                width: isMobile ? window.innerWidth : 500,
                height: isMobile ? window.innerHeight - 200 : 200, // Ajuste de altura para mobile
                className: "border rounded bg-white w-full h-full",
            }}
            ref={sigPadRef}
            />

          {/* Botões */}
          <div className="flex flex-wrap gap-2 w-full justify-center mt-4">
          <Button variant="ghost" onClick={onClose}>
              Sair
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              Limpar
            </Button>
            <Button onClick={handleSave}>
              Salvar Assinatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}