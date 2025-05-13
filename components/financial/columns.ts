import { ColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { isOrder, isFinancial } from "./utils"
import type { Order } from "@/components/types/orders"
import type { FinancialRecord } from "@/components/types/financial"


export type CombinedRecord = (Order & { source: "order" }) | (FinancialRecord & { source: "financial" })

export type CustomColumnMeta = {
  className?: string
}

export type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta
}

type FinancialColumnsProps = {
  suppliers: { id: string; name: string }[]
  onDelete?: (id: string) => void
  setSelectedOrder?: React.Dispatch<React.SetStateAction<Order | FinancialRecord | null>>
  setIsPaymentOpen?: React.Dispatch<React.SetStateAction<boolean>>
}

export const financialColumns = ({
  suppliers,
  onDelete,
  setSelectedOrder,
  setIsPaymentOpen,
}: FinancialColumnsProps): CustomColumnDef<CombinedRecord>[] => [
  {
    id: "drag",
    header: () => null,
    size: 50,
    meta: { className: "w-[50px]" },
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "issue_date",
    header: "Emissão",
    meta: { className: "truncate" },
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId)
      if (typeof value !== "string") return false
      const formatted = format(parseISO(value), "yyyy-MM-dd")
      return formatted === filterValue
    },
    cell: ({ row }) => {
      const rawDate = row.original.issue_date
      if (!rawDate) return "—"
      const [year, month, day] = rawDate.split("-")
      return `${day}/${month}/${year}`
    },
  },
  {
    accessorKey: "due_date",
    header: "Vencimento",
    meta: { className: "truncate" },
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId)
      if (typeof value !== "string") return false
      const formatted = format(parseISO(value), "yyyy-MM-dd")
      return formatted === filterValue
    },
    cell: ({ row }) => {
      const rawDate = row.original.due_date
      if (!rawDate) return "—"
      const [year, month, day] = rawDate.split("-")
      return `${day}/${month}/${year}`
    },
  },
  {
    id: "customer_or_supplier",
    header: "Fornecedor / Cliente",
    accessorFn: (row) => {
      if (isOrder(row)) return row.customer
      if (isFinancial(row)) return suppliers.find(s => s.id === row.supplier_id)?.name || row.supplier
      return "—"
    },
    filterFn: "includesString",
    meta: { className: "w-[250px] truncate uppercase" },
    cell: ({ row }) => {
      const record = row.original
      if (isOrder(record)) return record.customer || "—"
      if (isFinancial(record)) {
        const name = suppliers.find((s) => s.id === record.supplier_id)?.name
        return name || record.supplier || "—"
      }
      return "—"
    },
  },
  {
    accessorKey: "payment_method",
    header: "Método",
    meta: { className: "uppercase truncate" },
    cell: ({ row }) => {
      const method = row.original.payment_method
      const methodMap: Record<string, string> = {
        Pix: "Pix",
        Cash: "Dinheiro",
        Ticket: "Boleto",
        Card: "Cartão",
      }
      return methodMap[method] || method
    },
  },
  {
    accessorKey: "payment_status",
    header: "Pagamento",
    meta: { className: "uppercase truncate" },
    cell: ({ row }) => {
      const data = row.original
      if (isFinancial(data)) return data.status === "Paid" ? "Pago" : "Pendente"
      if (isOrder(data)) return data.payment_status
      return "—"
    },
  },
  {
    accessorKey: "remaining",
    header: "Restante",
    meta: { className: "text-right uppercase truncate" },
    cell: ({ row }) => {
      const total = Number(isOrder(row.original) ? row.original.total : row.original.amount) || 0
      const total_payed = isOrder(row.original) ? Number(row.original.total_payed ?? 0) : 0
      const remaining = total - total_payed
      return `R$ ${remaining.toFixed(2).replace(".", ",")}`
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    meta: { className: "text-right uppercase" },
    cell: ({ row }) => {
      const raw = isOrder(row.original)
        ? row.original.total
        : row.original.amount
      const value = Number(raw) || 0
      return `R$ ${value.toFixed(2).replace(".", ",")}`
    },
  },
  {
    id: "actions",
    header: "",
    size: 50,
    meta: { className: "w-[50px]" },
    cell: ({ row }) => {
      return null // <ActionsCell row={row} onDelete={onDelete} />
    },
  },
]  
