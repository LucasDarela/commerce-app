import React from "react";
import { Row } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import type { CombinedRecord } from "@/components/financial/types";
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton";

type Props = {
  row: Row<CombinedRecord>;
  setSelectedOrder: React.Dispatch<
    React.SetStateAction<CombinedRecord | null>
  >;
  setIsPaymentOpen: (open: boolean) => void;
  onDelete: (payload: {
  id: string;
  table: "orders" | "financial_records";
  deleteRecurring?: boolean;
  recurrenceGroupId?: string | null;
}) => void | Promise<void>;
  setIsResetPaymentOpen?: (open: boolean) => void;
};

export function ActionsCell({
  row,
  setSelectedOrder,
  setIsPaymentOpen,
  setIsResetPaymentOpen,
  onDelete,
}: Props) {
  const isFinancial = row.original.source === "financial";

  const id = row.original.id;
  const viewHref = isFinancial
    ? `/dashboard/financial/${id}/view`
    : `/dashboard/orders/${id}/view`;
  const editHref = isFinancial
    ? `/dashboard/financial/${id}/edit`
    : `/dashboard/orders/${id}/edit`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <IconDotsVertical size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={viewHref}
            rel="noopener noreferrer"
            className="w-full text-left"
          >
            Ver Espelho
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setSelectedOrder(row.original);
            
            const isFinancialPaid =
              isFinancial && (row.original as any).status === "Paid";
            const isOrderPaid =
              !isFinancial && (row.original as any).payment_status === "Paid";
            const isPaid = isFinancialPaid || isOrderPaid;

            if (isPaid && setIsResetPaymentOpen) {
              setIsResetPaymentOpen(true);
            } else {
              setIsPaymentOpen(true);
            }
          }}
        >
          {(isFinancial && (row.original as any).status === "Paid") ||
          (!isFinancial && (row.original as any).payment_status === "Paid")
            ? "Resetar Pagamento"
            : "Pagar"}
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={editHref}>Editar</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DeleteOrderButton
          id={id}
          companyId={(row.original as any).company_id}
          table={isFinancial ? "financial_records" : "orders"}
          asDropdownItem
          onDeleted={onDelete}
        />

      </DropdownMenuContent>
    </DropdownMenu>
  );
}

ActionsCell.displayName = "ActionsCell";
