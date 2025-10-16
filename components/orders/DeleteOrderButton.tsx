// components/orders/DeleteOrderButton.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  /** Se true, renderiza como item do DropdownMenu */
  asDropdownItem?: boolean;
};

export function DeleteOrderButton({
  orderId,
  asDropdownItem = false,
  onDeleted,
}: {
  orderId: string;
  asDropdownItem?: boolean;
  onDeleted?: () => void;
}) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const valid = confirm.trim().toLowerCase() === "deletar pedido";
  const onDelete = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Pedido deletado com sucesso.");
      window.location.reload();
      onDeleted?.();
      router.refresh();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao deletar pedido.");
    }
  };

  return (
    <>
      {asDropdownItem ? (
        <DropdownMenuItem
          className="text-red-600 focus:text-red-700"
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          Deletar pedido
        </DropdownMenuItem>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Deletar pedido
        </Button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é <b>permanente</b>. Para confirmar, digite{" "}
              <code>deletar pedido</code> abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder='Digite: "deletar pedido"'
            />
            {!valid && confirm.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                O texto precisa corresponder exatamente.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={onDelete} disabled={!valid}>
              Deletar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
