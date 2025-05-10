// components/data-financial-table-content.tsx
"use client"

import React from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { IconGripVertical } from "@tabler/icons-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { flexRender, Row } from "@tanstack/react-table"
import type { FinancialRecord } from "@/components/types/financial"
import type { Order } from "@/components/types/order"

export const isOrder = (record: any): record is Order => record?.source === "order"
export const isFinancial = (record: any): record is FinancialRecord => record?.source === "financial"

const DragHandle = ({ id }: { id: string }) => {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="cursor-grab active:cursor-grabbing text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Reordenar</span>
    </Button>
  )
}

export const DraggableRow = ({ row }: { row: Row<FinancialRecord> }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const isDragCell = cell.column.id === "drag"
        return (
          <TableCell
            key={cell.id}
            className={(cell.column.columnDef as any)?.meta?.className}
          >
            {isDragCell ? (
              <DragHandle id={row.original.id} />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
