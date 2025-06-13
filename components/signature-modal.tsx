"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
const DynamicSignatureCanvas = dynamic(
  () => import("react-signature-canvas") as any,
  { ssr: false },
);

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

export function SignatureModal({ open, onSave, onClose }: SignatureModalProps) {
  const sigPadRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(200);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isMobile) {
        setCanvasWidth(window.innerWidth - 40);
        setCanvasHeight(window.innerHeight - 200);
      }
    }
  }, [isMobile]);

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handleSave = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error("⚠️ Por favor, assine antes de salvar.");
      return;
    }

    const dataUrl = sigPadRef.current?.getCanvas().toDataURL("image/png");
    onSave(dataUrl);
    onClose();
    toast.success("🖊️ Assinatura salva com sucesso!");
  };
  useEffect(() => {
    const isMobileDevice = window.innerWidth <= 768;
    setIsMobile(isMobileDevice);

    if (isMobileDevice) {
      setCanvasWidth(window.innerWidth - 40);
      setCanvasHeight(200);
    } else {
      setCanvasWidth(500);
      setCanvasHeight(200);
    }
  }, []);

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
              width: canvasWidth,
              height: canvasHeight,
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
            <Button onClick={handleSave}>Salvar Assinatura</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
