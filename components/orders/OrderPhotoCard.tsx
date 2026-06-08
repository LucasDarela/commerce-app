"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, UploadCloud, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import clsx from "clsx";

interface OrderPhotoCardProps {
  title: string;
  url: string | null;
  onUpload: (file: File) => Promise<void>;
}

export function OrderPhotoCard({ title, url, onUpload }: OrderPhotoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Failed to get canvas context"));
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                  type: "image/webp",
                });
                resolve(newFile);
              } else {
                reject(new Error("Canvas to Blob failed"));
              }
            },
            "image/webp",
            0.6 // quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas imagens.");
      return;
    }

    try {
      setIsUploading(true);
      const compressedFile = await compressImage(file);
      await onUpload(compressedFile);
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar a imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="rounded-md border p-3 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setModalOpen(true)}
      >
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            className="w-full h-32 rounded object-cover border bg-muted"
          />
        ) : (
          <div className="w-full h-32 rounded border border-dashed border-muted-foreground/40 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Camera className="h-6 w-6 opacity-50" />
            <span className="text-xs font-medium">Adicionar Foto</span>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{title}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {url && (
              <Button
                variant="default"
                className="w-full gap-2 h-12"
                onClick={() => {
                  setModalOpen(false);
                  setViewImageOpen(true);
                }}
              >
                <ZoomIn className="w-5 h-5" /> Ver Imagem
              </Button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-1"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Câmera</span>
              </Button>

              <Button
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs">Galeria</span>
              </Button>
            </div>

            <div
              className={clsx(
                "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-primary/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                handleFile(file);
              }}
            >
              <UploadCloud className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-center text-muted-foreground">
                Arraste e solte uma imagem aqui
              </p>
            </div>
            
            {isUploading && (
              <div className="text-center text-sm text-muted-foreground animate-pulse">
                Processando e salvando imagem...
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewImageOpen} onOpenChange={setViewImageOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/90 border-none">
          <DialogTitle className="sr-only">Visualizar {title}</DialogTitle>
          <div className="relative flex items-center justify-center min-h-[50vh] p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setViewImageOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={title}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
