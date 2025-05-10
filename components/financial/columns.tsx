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
      id: "issue_date",
      header: "Emissão",
      meta: { className: "truncate" },
      accessorFn: (row) => row.issue_date,
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
        id: "phone",
        header: "Telefone",
        accessorFn: (row) => isOrder(row) ? row.phone : "", 
        meta: { className: "truncate" },
        cell: ({ row }) => {
          if (!isOrder(row.original)) return "—"
            const rawPhone = isOrder(row.original) ? row.original.phone : ""
            const phoneClean = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : ""
          const message = "Olá, tudo bem?"
          const encodedMessage = encodeURIComponent(message)
            const link = `https://wa.me/55${phoneClean}?text=${encodedMessage}`   
        
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                  <svg 
                  width="28"
                  height="28"
                  viewBox="0 0 32 32" 
                  className="text-primary hover:text-primary/80 fill-current transition-transform hover:scale-110"
                  xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d=" M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.955 8.955 0 0 1-1.72-5.272c0-4.955 4.04-8.995 8.997-8.995S25.2 10.845 25.2 15.8c0 4.958-4.04 8.998-8.998 8.998zm0-19.798c-5.96 0-10.8 4.842-10.8 10.8 0 1.964.53 3.898 1.546 5.574L5 27.176l5.974-1.92a10.807 10.807 0 0 0 16.03-9.455c0-5.958-4.842-10.8-10.802-10.8z" 
                    fillRule="evenodd">
                    </path>
                  </svg>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  Send message via WhatsApp
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
      },
      {
        id: "source",
        header: "Origem",
        meta: { className: "truncate"},
        accessorFn: (row) => {
          if ("source" in row) return row.source
          return "unknown"
        },
        cell: ({ row }) =>
          isOrder(row.original) ? "Pedido" : "Nota Financeira",
    },
    {
        id: "category",
        header: "Categoria",
        meta: { className: " uppercase truncate" },
        accessorFn: (row) => isFinancial(row) ? row.category : undefined,
        cell: ({ row }) => isFinancial(row.original) ? row.original.category : "—",
      },
    {
        id: "type",
        header: "Tipo",
        meta: { className: "uppercase truncate" },
        accessorFn: (row) => isFinancial(row) ? row.type : undefined,
        cell: ({ row }) => {
          if (!isFinancial(row.original)) return "—"
          return row.original.type === "input" ? "Nota de Entrada" : "Nota de Saída"
        }
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
      meta: { className: "uppercase truncate" },
      accessorFn: (row) => isFinancial(row) ? row.status : undefined,
      cell: ({ row }) => {
        if (!isFinancial(row.original)) return "—"
        return row.original.status === "Paid" ? "Pago" : "Pendente"
      },
    },
    {
      id: "remaining",
      header: "Restante",
      meta: { className: "text-right uppercase truncate" },
      accessorFn: (row) => {
        const total = isOrder(row) ? row.total : row.amount
        const total_payed = isOrder(row) ? row.total_payed ?? 0 : 0
        return (Number(total) - Number(total_payed))
      },
      cell: ({ row }) => {
        const total = Number(isOrder(row.original) ? row.original.total : row.original.amount) || 0
        const total_payed = isOrder(row.original) ? Number(row.original.total_payed ?? 0) : 0
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
        if (!onDelete) return null
    
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