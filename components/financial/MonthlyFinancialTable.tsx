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

interface MonthlyFinancialTableProps {
  records: CombinedRecord[]
  columns: ColumnDef<CombinedRecord, any>[]
}

export function MonthlyFinancialTable({ records, columns }: MonthlyFinancialTableProps) {

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })


  const table = useReactTable<CombinedRecord>({
    data: records,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <DataTableConfig
        table={table}
        data={table.getRowModel().rows.map(row => row.original)}
        columns={columns}
      />
      <TablePagination table={table} />
    </>
  )
}