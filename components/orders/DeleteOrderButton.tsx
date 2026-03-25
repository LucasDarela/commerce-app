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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

type Props = {
  orderId: string;
  companyId: string;
  asDropdownItem?: boolean;
  onDeleted?: () => void;
};

export function DeleteOrderButton({
  orderId,
  companyId,
  asDropdownItem = false,
  onDeleted,
}: Props) {
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const valid = confirm.trim().toLowerCase() === "deletar pedido";

  const onDelete = async () => {
    if (!valid || deleting) return;

    try {
      setDeleting(true);

      console.log("DELETE DEBUG", { companyId, orderId });

      const { data, error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .eq("company_id", companyId)
        .select("id");

      console.log("DELETE RESULT", { data, error });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Pedido não encontrado no banco.");
      }

      toast.success("Pedido deletado com sucesso.");
      onDeleted?.();
      setOpen(false);
      setConfirm("");
    } catch (e: any) {
      console.error("Erro ao deletar pedido:", e);
      toast.error(e?.message || "Falha ao deletar pedido.");
    } finally {
      setDeleting(false);
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

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirm("");
          }
        }}
      >
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
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!valid || deleting}
            >
              {deleting ? "Deletando..." : "Deletar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}