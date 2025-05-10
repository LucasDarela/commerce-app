"use client"

import * as React from "react"
import {
  flexRender,
  Row,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table,
} from "@tanstack/react-table"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DraggableRow } from "./DraggableRow"
import { verticalListSortingStrategy, SortableContext } from "@dnd-kit/sortable"
import type { CustomColumnDef } from "./columns"
import type { Order } from "@/components/financial/DataFinancialTable"
import type { FinancialRecord } from "@/components/financial/DataFinancialTable"

type Props<T> = {
  table: Table<T>
  data: T[]
  columns: CustomColumnDef<T>[]
}

export function DataTableConfig<T extends { id: string }>({ data, columns, table: ReactTable, }: Props<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-lg border">
      <UITable className="w-full uppercase">
        <TableHeader className="bg-muted sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            <SortableContext
              items={ReactTable.getRowModel().rows.map((row) => row.original.id)}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} />
              ))}
            </SortableContext>
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum resultado encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UITable>
    </div>
  )
}