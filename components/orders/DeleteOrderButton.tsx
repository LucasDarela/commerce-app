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
  id: string;
  companyId: string;
  table: "orders" | "financial_records";
  asDropdownItem?: boolean;
  onDeleted?: () => void;
};

export function DeleteOrderButton({
  id,
  companyId,
  table,
  asDropdownItem = false,
  onDeleted,
}: Props) {
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const isOrder = table === "orders";
  const label = isOrder ? "pedido" : "nota";
  const expectedText = isOrder ? "deletar pedido" : "deletar nota";

  const valid = confirm.trim().toLowerCase() === expectedText;

  const onDelete = async () => {
    if (!valid || deleting) return;

    try {
      setDeleting(true);

      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id");

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          isOrder
            ? "Pedido não encontrado no banco."
            : "Nota não encontrada no banco.",
        );
      }

      toast.success(
        isOrder
          ? "Pedido deletado com sucesso."
          : "Nota deletada com sucesso.",
      );

      onDeleted?.();
      setOpen(false);
      setConfirm("");
    } catch (e: any) {
      console.error(`Erro ao deletar ${label}:`, e);
      toast.error(
        e?.message ||
          (isOrder ? "Falha ao deletar pedido." : "Falha ao deletar nota."),
      );
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
          {isOrder ? "Deletar pedido" : "Deletar nota"}
        </DropdownMenuItem>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {isOrder ? "Deletar pedido" : "Deletar nota"}
        </Button>
      )}

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirm("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é <b>permanente</b>. Para confirmar, digite{" "}
              <code>{expectedText}</code> abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={`Digite: "${expectedText}"`}
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