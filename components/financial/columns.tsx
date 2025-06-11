import { ColumnDef, AccessorFnColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FinancialRecord } from "@/components/types/financial"
import { Order as OrderBasic } from "@/components/types/order"
import { isOrder, isFinancial } from "./utils"
import { ActionsCell } from "../actions-cell"
import { Order } from "@/components/types/orders"

export type CustomColumnMeta = {
  className?: string
}

export type CustomColumnDef<T> =
  | (AccessorFnColumnDef<T, unknown> & { meta?: CustomColumnMeta })
  | (ColumnDef<T, unknown> & { meta?: CustomColumnMeta })

export function financialColumns({
  suppliers,
  onDelete,
  setSelectedOrder,
  setIsPaymentOpen,
}: {
  suppliers: { id: string; name: string }[]
  onDelete: (id: string) => void
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | FinancialRecord | null>>
  setIsPaymentOpen: (open: boolean) => void
}): CustomColumnDef<Order | FinancialRecord>[] {
  return [
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
      id: "due_date",
      header: "Vencimento",
      meta: { className: "truncate" },
      accessorFn: (row) => row.due_date,
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
      size: 200,
      accessorFn: (row) => {
        if (isOrder(row)) return row.customer
        if (isFinancial(row)) return suppliers.find(s => s.id === row.supplier_id)?.name || row.supplier
        return "—"
      },
      filterFn: "includesString",
      meta: { className: "w-[200px] truncate uppercase" },
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
        id: "source",
        header: "Origem",
        meta: { className: "truncate"},
        enableHiding: false,
        accessorFn: (row) => {
          if ("source" in row) return row.source
          return "unknown"
        },
        cell: ({ row }) =>
          isOrder(row.original) ? "Pedido" : "Nota Financeira",
    },
    {
      id: "type",
      header: "Tipo",
      accessorFn: (row) =>
        isFinancial(row) ? row.type : "output", 
      cell: ({ row }) => {
        if (isFinancial(row.original)) {
          return row.original.type === "input"
            ? "Entrada"
            : "Saída"
        }
        return "Saída"
      },
    },
    {
      id: "category",
      header: "Categoria",
      accessorFn: (row) =>
        isFinancial(row) ? row.category : "pedido",
      cell: ({ row }) =>
        isFinancial(row.original) ? row.original.category : "Pedido",
    },
    {
      id: "payment_method",
      header: "Método",
      meta: { className: "uppercase truncate" },
      accessorFn: (row) => row.payment_method,
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
      id: "payment_status",
      header: "Pagamento",
      accessorFn: (row) => {
        if (isFinancial(row)) return row.status === "Paid" ? "Paid" : "Unpaid"
        return row.payment_status === "Paid" ? "Paid" : "Unpaid"
      },
      filterFn: (row, columnId, filterValue) => {
        const value = row.getValue(columnId)
        return value === filterValue
      },
      cell: ({ row }) => {
        const status = isFinancial(row.original)
        ? row.original.status
        : row.original.payment_status

      return status === "Paid" ? "Pago" : "Pendente"
      },
    },
    {
      id: "remaining",
      header: "Restante",
      meta: { className: "text-right uppercase truncate" },
      accessorFn: (row) => {
        const total = isOrder(row) ? row.total : row.amount
        const total_payed = isOrder(row)
          ? row.total_payed ?? 0
          : (row as FinancialRecord).total_payed ?? 0
    
        return Number(total) - Number(total_payed)
      },
      cell: ({ row }) => {
        const total = Number(isOrder(row.original) ? row.original.total : row.original.amount) || 0
        const total_payed = isOrder(row.original)
          ? Number(row.original.total_payed ?? 0)
          : Number((row.original as FinancialRecord).total_payed ?? 0)
    
        const remaining = total - total_payed
        return `R$ ${remaining.toFixed(2).replace(".", ",")}`
      },
    },
    {
      id: "total",
      header: "Total",
      meta: { className: "text-right uppercase" },
      accessorFn: (row) => isOrder(row) ? row.total : row.amount,
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
        return (
          <ActionsCell
            row={row}
            onDelete={onDelete}
            setSelectedOrder={setSelectedOrder} 
            setIsPaymentOpen={setIsPaymentOpen}
          />
        )
      },
    },
  ]
}