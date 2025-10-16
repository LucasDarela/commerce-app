"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import { CancelNfeModal } from "./CancelNfeModal";

interface NfeActionsDropdownProps {
  refId: string;
  companyId: string;
  status?: string;
}

export function NfeActionsDropdown({
  refId,
  companyId,
  status,
}: NfeActionsDropdownProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  if (status !== "autorizado") return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <IconDotsVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)}>
            Cancelar
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Inutilizar</DropdownMenuItem>
          <DropdownMenuItem disabled>Carta de Correção</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelNfeModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        refId={refId}
        companyId={companyId}
      />
    </>
  );
}
