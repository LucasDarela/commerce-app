// components/financial/MonthlyFinancialTable.tsx

"use client"

import * as React from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
} from "@tanstack/react-table"
import { DataTableConfig } from "./DataTableConfig"
import { CombinedRecord } from "./DataFinancialTable"
import { TablePagination } from "@/components/ui/pagination"
import type { Order, FinancialRecord } from "./DataFinancialTable"


type MonthlyFinancialTableProps = {
  table: ReturnType<typeof useReactTable<CombinedRecord>>
  monthKey: string
}


export function MonthlyFinancialTable({ table, monthKey }: MonthlyFinancialTableProps) {
  const baseRows = table.getFilteredRowModel().rows

  const filteredRows = React.useMemo(() => {
    return baseRows.filter((row) => {
      const dueDate = row.original.due_date
      if (!dueDate) return false
      const [year, month] = dueDate.split("-")
      return `${month}/${year}` === monthKey
    })
  }, [baseRows, monthKey])

  const data = React.useMemo(() => {
    return filteredRows
      .map((r) => r.original)
      .sort((a, b) => {
        const dateA = new Date(a.due_date || "").getTime()
        const dateB = new Date(b.due_date || "").getTime()
        return dateA - dateB 
      })
  }, [filteredRows])

  const columns = React.useMemo(() => table.getAllColumns().map((col) => col.columnDef), [table])
  const state = table.getState()

  const tableForMonth = useReactTable({
    data,
    columns,
    state: {
      sorting: state.sorting,
      columnVisibility: state.columnVisibility,
      columnFilters: state.columnFilters,
      rowSelection: state.rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <DataTableConfig table={tableForMonth} />
      <TablePagination table={tableForMonth} />
    </>
  )
}