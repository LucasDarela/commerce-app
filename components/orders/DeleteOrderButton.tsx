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
  onDeleted?: (payload: {
    deleteRecurring?: boolean;
    recurrenceGroupId?: string | null;
    table: "orders" | "financial_records";
    id: string;
  }) => void | Promise<void>;
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

  const [deleteRecurring, setDeleteRecurring] = React.useState(false);
  const [recurrenceGroupId, setRecurrenceGroupId] = React.useState<string | null>(null);
  const [hasRecurrenceGroup, setHasRecurrenceGroup] = React.useState(false);
  const [loadingRecurrenceInfo, setLoadingRecurrenceInfo] = React.useState(false);

  const isOrder = table === "orders";
  const label = isOrder ? "pedido" : "nota";
  const expectedText = isOrder ? "deletar pedido" : "deletar nota";
  const valid = confirm.trim().toLowerCase() === expectedText;

React.useEffect(() => {
  let cancelled = false;

  const loadFinancialRecord = async () => {
    if (table !== "financial_records" || !open) return;

    setLoadingRecurrenceInfo(true);

    const { data, error } = await supabase
      .from("financial_records")
      .select("id, recurrence_group_id")
      .eq("id", id)
      .eq("company_id", companyId)
      .limit(1);

    if (cancelled) return;

    if (error) {
      console.error("Erro ao buscar recorrência da nota:", error);
      setRecurrenceGroupId(null);
      setHasRecurrenceGroup(false);
      setLoadingRecurrenceInfo(false);
      return;
    }

    const record = data?.[0] ?? null;

    setRecurrenceGroupId(record?.recurrence_group_id ?? null);
    setHasRecurrenceGroup(!!record?.recurrence_group_id);
    setLoadingRecurrenceInfo(false);
  };

  loadFinancialRecord();

  return () => {
    cancelled = true;
  };
}, [open, table, id, companyId, supabase]);

  const onDelete = async () => {
    if (!valid || deleting) return;

    try {
      setDeleting(true);

      if (table === "financial_records" && deleteRecurring && recurrenceGroupId) {
        const { data, error } = await supabase
          .from("financial_records")
          .delete()
          .eq("recurrence_group_id", recurrenceGroupId)
          .eq("company_id", companyId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error("Nenhuma nota da recorrência foi encontrada.");
        }

        toast.success("Todas as notas da recorrência foram deletadas com sucesso.");
      } else {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .eq("company_id", companyId)
          .select("id");

        if (error) throw error;

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
      }

      setOpen(false);
      setConfirm("");
      setDeleteRecurring(false);
      setRecurrenceGroupId(null);
      setHasRecurrenceGroup(false);

      await Promise.resolve(
        onDeleted?.({
          deleteRecurring,
          recurrenceGroupId,
          table,
          id,
        }),
      );
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
          if (deleting) return;

          setOpen(next);

          if (!next) {
            setConfirm("");
            setDeleteRecurring(false);
            setRecurrenceGroupId(null);
            setHasRecurrenceGroup(false);
            setLoadingRecurrenceInfo(false);
          }
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

          <div className="py-2 space-y-3">
            <Input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={`Digite: "${expectedText}"`}
            />

            {!valid && confirm.length > 0 && (
              <p className="text-xs text-muted-foreground">
                O texto precisa corresponder exatamente.
              </p>
            )}

            {table === "financial_records" && hasRecurrenceGroup && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deleteRecurring}
                  onChange={(e) => setDeleteRecurring(e.target.checked)}
                  disabled={deleting || loadingRecurrenceInfo}
                />
                Deletar todas as notas desta recorrência
              </label>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>

            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!valid || deleting || loadingRecurrenceInfo}
            >
              {deleting ? "Deletando..." : "Deletar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}