"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import { CancelNfeModal } from "./CancelNfeModal";
import { CartaCorrecaoModal } from "./CartaCorrecaoModal";
import { InutilizacaoModal } from "./InutilizacaoModal";

interface NfeActionsDropdownProps {
  refId: string;
  companyId: string;
  status?: string;
  numero?: string | number | null;
  serie?: string | number | null;
}

export function NfeActionsDropdown({
  refId,
  companyId,
  status,
  numero,
  serie,
}: NfeActionsDropdownProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCartaCorrecaoOpen, setIsCartaCorrecaoOpen] = useState(false);
  const [isInutilizacaoOpen, setIsInutilizacaoOpen] = useState(false);

  const statusNorm = (status ?? "").toLowerCase().trim();
  const isAutorizado = statusNorm.includes("autorizad");

  // Só mostra o dropdown se houver ao menos uma ação disponível
  if (!isAutorizado) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <IconDotsVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAutorizado && (
            <>
              <DropdownMenuItem onClick={() => setIsCartaCorrecaoOpen(true)}>
                Carta de Correção
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)}>
                Cancelar NF-e
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsInutilizacaoOpen(true)}>
                Inutilizar Numeração
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelNfeModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        refId={refId}
        companyId={companyId}
      />

      <CartaCorrecaoModal
        open={isCartaCorrecaoOpen}
        onOpenChange={setIsCartaCorrecaoOpen}
        refId={refId}
        companyId={companyId}
        invoiceNumero={numero}
      />

      <InutilizacaoModal
        open={isInutilizacaoOpen}
        onOpenChange={setIsInutilizacaoOpen}
        companyId={companyId}
        serie={serie}
        numero={numero}
      />
    </>
  );
}
