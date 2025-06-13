"use client";

import * as React from "react";
import {
  flexRender,
  Row,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table,
} from "@tanstack/react-table";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DraggableRow } from "./DraggableRow";
import {
  verticalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import type { CustomColumnDef } from "./columns";
import type { Order } from "@/components/financial/DataFinancialTable";
import type { FinancialRecord } from "@/components/financial/DataFinancialTable";

type Props<T> = {
  table: Table<T>;
  rows?: Row<T>[];
  data?: T[];
  columns?: CustomColumnDef<T>[];
};

export function DataTableConfig<T extends { id: string }>({
  table,
  rows,
}: Props<T>) {
  const visibleRows = rows ?? table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-lg border">
      <UITable className="w-full uppercase">
        <TableHeader className="bg-muted sticky top-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="h-10" key={headerGroup.id}>
              {headerGroup.headers
                .filter((header) => header.column.getIsVisible())
                .map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell className="h-13" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </UITable>
    </div>
  );
}
