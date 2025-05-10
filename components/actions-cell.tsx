import React from "react"
import { Row } from "@tanstack/react-table"
import Link from "next/link"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { IconDotsVertical } from "@tabler/icons-react"
import type { FinancialRecord } from "@/components/types/financial"
import { getPaginationRowModel } from "@tanstack/react-table"
import type { Order } from "@/components/types/orders"


type Props = {
  row: Row<Order | FinancialRecord>
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | FinancialRecord | null>>
  setIsPaymentOpen: (open: boolean) => void
  onDelete: (id: string) => void
}

function isOrder(record: any): record is Order {
  return record && record.source === "order"
}

export function ActionsCell({
  row,
  setSelectedOrder,
  setIsPaymentOpen,
  onDelete,
}: Props) {
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
      href={`/dashboard/orders/${row.original.id}/view`}
      rel="noopener noreferrer"
      className="w-full text-left"
    >
      Ver Espelho
    </a>
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => {
        if (isOrder(row.original)) {
          setSelectedOrder(row.original)
          setIsPaymentOpen(true)
        }
      }}
    >
      Pagar
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href={`/dashboard/orders/${row.original.id}/edit`}>
        Editar
      </Link>
    </DropdownMenuItem>

    <DropdownMenuSeparator />

    <DropdownMenuItem
      variant="destructive"
      onClick={() => onDelete(row.original.id)}
    >
      Deletar
    </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    )
  }

ActionsCell.displayName = "ActionsCell"