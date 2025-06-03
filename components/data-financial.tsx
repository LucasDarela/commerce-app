"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { useEffect, useState } from "react"
import { useCompanyIntegration } from "@/hooks/use-company-integration"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Link from "next/link"
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabase } from "@/lib/supabase"
import { PaymentModal } from "@/components/payment-modal"
import { YourFinancialRecords } from "@/components/your-financial-modal"
import { ActionsCell } from "@/components/actions-cell"
import { mapToFinancial } from "@/utils/mapPaymentMethod"

//New Schema
export const schema = z.object({
    id: z.string(),
    appointment_date: z.string(),      
    appointment_hour: z.string(),
    appointment_local: z.string(),
    customer: z.string(),
    phone: z.string(),
    amount: z.number(),
    products: z.string(),
    delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]), 
    payment_method: z.enum(["Pix", "Dinheiro", "Boleto", "Cartao"]),
    payment_status: z.enum(["Unpaid", "Paid"]),
    days_ticket: z.union([z.string(), z.number()]).optional(),
    freight: z.union([z.string(), z.number(), z.null()]).optional(),
    note_number: z.string().optional(),
    document_type: z.string().optional(),
    total: z.number(),
    total_payed: z.number().optional(),
    issue_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional()
})

const financialSchema = z.object({
    id: z.string(),
    supplier_id: z.string().uuid(),
    supplier: z.string(),
    company_id: z.string(),
    issue_date: z.string(),
    due_date: z.string().nullable().optional(),
    description: z.string().optional(),
    category: z.string(),
    amount: z.preprocess((val) => Number(val), z.number()),
    status: z.enum(["Paid", "Unpaid"]),
    payment_method: z.enum(["Pix", "Dinheiro", "Boleto", "Cartao"]),
    invoice_number: z.string().optional(),
    type: z.enum(["input", "output"]),
    notes: z.string().optional(),
  })

type Sale = z.infer<typeof schema>
type Order = z.infer<typeof schema> & { source: "order"}
type FinancialRecord = z.infer<typeof financialSchema> & { 
  source: "order" | "financial" 
  phone?: string
}

type CustomColumnMeta = {
  className?: string
}

type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta
}

// function mapToFinancialPaymentMethod(
//   method: string) {
//   switch (method) {
//     case "Cash":
//       return "Dinheiro"
//     case "Card":
//       return "Cartao"
//     case "Ticket":
//       return "Boleto"
//     default:
//       return method
//   }
// }

// Create a separate component for the drag handle

function DragHandle({ id }: { id: string }) {
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
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function DraggableRow({ row }: { row: Row<FinancialRecord> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

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
        const isDragCell = cell.column.id === "drag";

        return (
          <TableCell key={cell.id} className={(cell.column.columnDef as CustomColumnDef<Order>)?.meta?.className}>
          {isDragCell ? (
              <DragHandle id={row.original.id} />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function isOrder(record: any): record is Order {
  return record?.source === "order"
}

function isFinancial(record: any): record is FinancialRecord {
  return record.source === "financial"
}

export default function DataFinancialTable() {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Sale | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const supabase = createClientComponentClient()
  const [orders, setOrders] = useState<(Order & { source: "order" })[]>([])
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateInput, setDateInput] = useState("")
  const { accessToken, loading: loadingIntegration, error: integrationError } = useCompanyIntegration('mercado_pago')
  const router = useRouter();
  const [issueDateInput, setIssueDateInput] = useState("")
  const [dueDateInput, setDueDateInput] = useState("")
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [selectedFinancial, setSelectedFinancial] = useState<FinancialRecord | null>(null)
  const [isFinancialPaymentOpen, setIsFinancialPaymentOpen] = useState(false)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orders_column_visibility")
      return stored
        ? JSON.parse(stored)
        : {
          issue_date: true,
          due_date: true,
          customer_or_supplier: true,
          phone: false,
          source: false,
          category: false,
          type: true,
          payment_method: true,
          payment_status: true,
          remaining: true,
          total: true,
          }
    }
    return {
      issue_date: true,
      due_date: true,
      customer_or_supplier: true,
      phone: false,
      source: false,
      category: false,
      type: true,
      payment_method: true,
      payment_status: true,
      remaining: true,
      total: true,
    }
  })

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 8) value = value.slice(0, 8)
  
    const parts = []
    if (value.length > 0) parts.push(value.slice(0, 2))
    if (value.length > 2) parts.push(value.slice(2, 4))
    if (value.length > 4) parts.push(value.slice(4, 8))
  
    const formatted = parts.join("/")
    setDateInput(formatted)
  
    if (formatted.length === 10) {
      const [day, month, year] = formatted.split("/")
      const isoDate = `${year}-${month}-${day}`
      table.getColumn("due_date")?.setFilterValue(isoDate)
    } else {
      table.getColumn("due_date")?.setFilterValue(undefined)
    }
  }

  const refreshOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_index", { ascending: true })
  
    if (error) {
      console.error("Erro ao buscar pedidos:", error)
      return
    }
  
    const parsed = schema.array().safeParse(data)
    if (parsed.success) {
      setOrders(parsed.data.map((o) => ({ ...o, source: "order"})));
    } else {
      console.error("Erro ao validar schema Zod:", parsed.error)
    }
  }

  const deleteOrderById = async (id: string) => {
    const confirmDelete = confirm("Tem certeza que deseja excluir esta nota?");
    if (!confirmDelete) return;
  
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);
  
    if (error) {
      toast.error("Erro ao deletar nota.");
      return;
    }
  
    toast.success("Nota excluída com sucesso!");
    setOrders((prev) => prev.filter((order) => order.id !== id));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orders_column_visibility", JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])


  const fetchAll = async () => {
    const [ordersRes, financialRes, suppliersRes] = await Promise.all([
      supabase.from("orders").select("*").order("order_index", { ascending: true }),
      supabase.from("financial_records").select("*").order("issue_date", { ascending: false }),
      supabase.from("suppliers").select("id, name"),
    ]);

    // Parse dos pedidos
    const parsedOrders = schema.array().safeParse(ordersRes.data);
    if (parsedOrders.success) {
      setOrders(parsedOrders.data.map((o) => ({ ...o, source: "order" })));
    } else {
      console.error("Erro ao validar orders com Zod:", parsedOrders.error);
    }
  
    // Parse das notas financeiras
    const parsedFinancials = financialSchema.array().safeParse(financialRes.data);
    if (parsedFinancials.success) {
      const financialsWithSource: FinancialRecord[] = parsedFinancials.data.map((f) => ({
        ...f,
        source: "financial",
      }));
      setFinancialRecords(financialsWithSource);
    } else {
      console.error("Erro ao validar financials com Zod:", parsedFinancials.error);
    }
  
    setSuppliers(suppliersRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll()
  }, [])

  const combinedData: FinancialRecord[] = [
    ...orders.map((o): FinancialRecord => ({
      id: o.id,
      issue_date: o.issue_date || "", 
      due_date: o.due_date || null,
      amount: o.total,
      status: o.payment_status === "Paid" ? "Paid" : "Unpaid",
      payment_method: mapToFinancial(o.payment_method),
      supplier_id: "", 
      supplier: o.customer || "Cliente",
      company_id: "", 
      category: "order",
      description: o.customer || "Pedido",
      type: "output" as const,
      notes: "",
      source: "order",
      phone: o.phone || "", 
    })),
    ...financialRecords,
  ]

  //const columns
  const columns: CustomColumnDef<FinancialRecord>[] = [
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
          const value = row.getValue(columnId);
          if (typeof value !== "string") return false;
          const formatted = format(parseISO(value), "yyyy-MM-dd");
          return formatted === filterValue;
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
      meta: { className: " truncate" },
      filterFn: (row, columnId, filterValue) => {
        const value = row.getValue(columnId);
        if (typeof value !== "string") return false;
        const formatted = format(parseISO(value), "yyyy-MM-dd");
        return formatted === filterValue;
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
      accessorKey: "phone",
      header: "Telefone",
      accessorFn: (row) => isOrder(row) ? row.phone : "", 
      meta: { className: "truncate" },
      cell: ({ row }) => {
        if (row.original.source !== "order") return "—"
      
const rawPhone = isOrder(row.original) ? row.original.phone : ""
const phoneClean = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : ""
        const message = "Olá, tudo bem?"
        const encodedMessage = encodeURIComponent(message)
const link = `https://wa.me/55${phoneClean}?text=${encodedMessage}`
      
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 32 32"
                    className="text-primary hover:text-primary/80 fill-current transition-transform hover:scale-110"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.11 17.205... (svg completo) ..." fillRule="evenodd" />
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
        accessorKey: "source",
        header: "Origem",
        meta: { className: "truncate"},
        cell: ({ row }) =>
          row.original.source === "order" ? "Pedido" : "Nota Financeira",
    },
    {
        accessorKey: "category",
        header: "Categoria",
        meta: { className: " uppercase truncate" },
        cell: ({ row }) => row.original.category,
      },
      {
        accessorKey: "type",
        header: "Tipo", 
        meta: { className: " uppercase truncate" },
        cell: ({ row }) => {
            const type = row.original.type
            return type === "input" ? "Nota de Entrada" : "Nota de Saída"
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
          Dinheiro: "Dinheiro",
          Boleto: "Boleto",
          Cartao: "Cartão"
        }
      
        return methodMap[method] || method
      },
    },
    {
      accessorKey: "payment_status",
      header: "Pagamento",
      meta: { className: "uppercase truncate" },
      cell: ({ row }) => {
        const data = row.original as Order | FinancialRecord
    
        const status =
          isFinancial(data) ? data.status : isOrder(data) ? data.payment_status : undefined
    
        return status === "Paid"
          ? "Pago"
          : status === "Unpaid"
          ? "Pendente"
          : "—"
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
          : (row.original as FinancialRecord).amount
      
        const value = Number(raw) || 0
        return `R$ ${value.toFixed(2).replace('.', ',')}`
      },
    },
    {
      id: "actions",
      header: "",
      size: 50,
      meta: { className: "w-[50px]" },
      cell: ({ row }) => {
       
      },
    },
  ]

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => orders?.map(({ id }) => id) || [],
    [orders]
  )

  const table = useReactTable<FinancialRecord>({
    data: combinedData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
  
    if (!active || !over || active.id === over.id) return
  
    const oldIndex = orders.findIndex((item) => item.id === active.id)
    const newIndex = orders.findIndex((item) => item.id === over.id)
  
    const newData = arrayMove(orders, oldIndex, newIndex)
  
    setOrders(newData) // Atualiza visualmente imediatamente
    setIsSavingOrder(true) // Ativa o spinner
  
    // Atualiza Supabase em paralelo
    Promise.all(
      newData.map((item, index) =>
        supabase.from("orders").update({ order_index: index }).eq("id", item.id)
      )
    )
      .then(() => {
        setIsSavingOrder(false)
      })
      .catch((err) => {
        console.error("Erro ao atualizar ordem:", err)
        setIsSavingOrder(false)
      })
  }

  return (
    <>
    
    {isSavingOrder && (
      <div className="fixed top-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white p-2 shadow-lg border border-muted">
        <svg
          className="animate-spin h-4 w-4 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
          ></path>
        </svg>
      </div>
    )}

<div className="w-full flex justify-between items-center px-4 lg:px-6 py-1">
  {/* Título à esquerda */}
  <h2 className="text-xl font-bold">Financeiro</h2>

  {/* Botões à direita */}
  <div className="flex gap-2">
    {/* Colunas */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[100px]">
          <IconLayoutColumns />
          <span className="hidden sm:inline">Colunas</span>
          <IconChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {table
          .getAllColumns()
          .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Botão Adicionar */}
    <Link href="/dashboard/financial/add">
      <Button
        variant="default"
        size="sm"
        className="min-w-[100px] bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <IconPlus className="mr-1" />
        <span className="hidden sm:inline">Financeiro</span>
      </Button>
    </Link>
  </div>
</div>

<div className="grid gap-2 px-4 py-1 lg:px-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-center">
  <Input
  type="text"
  inputMode="numeric"
  placeholder="Emissão"
  value={issueDateInput}
  onChange={(e) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 8) value = value.slice(0, 8)

    const parts = []
    if (value.length > 0) parts.push(value.slice(0, 2))
    if (value.length > 2) parts.push(value.slice(2, 4))
    if (value.length > 4) parts.push(value.slice(4, 8))

    const formatted = parts.join("/")
    setIssueDateInput(formatted)

    if (formatted.length === 10) {
      const [day, month, year] = formatted.split("/")
      const isoDate = `${year}-${month}-${day}`
      table.getColumn("issue_date")?.setFilterValue(isoDate)
    } else {
      table.getColumn("issue_date")?.setFilterValue(undefined)
    }
  }}
  maxLength={10}
  className="min-w-[70px] w-full"
/>

<Input
  type="text"
  inputMode="numeric"
  placeholder="Vencimento"
  value={dueDateInput}
  onChange={(e) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 8) value = value.slice(0, 8)

    const parts = []
    if (value.length > 0) parts.push(value.slice(0, 2))
    if (value.length > 2) parts.push(value.slice(2, 4))
    if (value.length > 4) parts.push(value.slice(4, 8))

    const formatted = parts.join("/")
    setDueDateInput(formatted)

    if (formatted.length === 10) {
      const [day, month, year] = formatted.split("/")
      const isoDate = `${year}-${month}-${day}`
      table.getColumn("due_date")?.setFilterValue(isoDate)
    } else {
      table.getColumn("due_date")?.setFilterValue(undefined)
    }
  }}
  maxLength={10}
  className="min-w-[70px] w-full"
/>

  {/* Nome do cliente */}
  <Input
    placeholder="Buscar por Nome"
    value={(table.getColumn("customer_or_supplier")?.getFilterValue() as string) ?? ""}
    onChange={(e) => table.getColumn("customer_or_supplier")?.setFilterValue(e.target.value)}
    className="min-w-[100px] w-full"
  />

<Select
  value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
  onValueChange={(value) =>
    table.getColumn("type")?.setFilterValue(value === "all" ? undefined : value)
  }
>
  <SelectTrigger className="min-w-[100px] w-full">
    <SelectValue placeholder="Tipo de nota" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas</SelectItem>
    <SelectItem value="input">Entrada</SelectItem>
    <SelectItem value="output">Saída</SelectItem>
  </SelectContent>
</Select>


  {/* Tipo de pagamento */}
  <Select
    value={(table.getColumn("payment_method")?.getFilterValue() as string) ?? ""}
    onValueChange={(value) =>
      table.getColumn("payment_method")?.setFilterValue(value === "all" ? undefined : value)
    }
  >
    <SelectTrigger className="min-w-[90px] w-full">
      <SelectValue placeholder="Método Pagamento" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="Pix">Pix</SelectItem>
      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
      <SelectItem value="Boleto">Boleto</SelectItem>
      <SelectItem value="Cartao">Cartão</SelectItem>
    </SelectContent>
  </Select>

  {/* Status de pagamento */}
  <Select
    value={(table.getColumn("payment_status")?.getFilterValue() as string) ?? ""}
    onValueChange={(value) =>
      table.getColumn("payment_status")?.setFilterValue(value === "all" ? undefined : value)
    }
  >
    <SelectTrigger className="min-w-[90px] w-full">
      <SelectValue placeholder="Status Pagamento" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="Unpaid">Pendente</SelectItem>
      <SelectItem value="Paid">Pago</SelectItem>
    </SelectContent>
  </Select>
</div>
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table className="w-full uppercase">
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (

                        <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={(header.column.columnDef as CustomColumnDef<Order>)?.meta?.className}
                          >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={table.getRowModel().rows.map((row) => row.original.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
    {selectedOrder && (
  <PaymentModal
    order={{
      ...selectedOrder,
      total_payed: selectedOrder.total_payed ?? 0,
    }}
    open={isPaymentOpen}
    onClose={() => setIsPaymentOpen(false)}
    onSuccess={() => {
      refreshOrders()
      setIsPaymentOpen(false)
    }}
  />
)}
{selectedFinancial && (
  <YourFinancialRecords
  open={isFinancialPaymentOpen}
  financial={selectedFinancial}
  onClose={() => setIsFinancialPaymentOpen(false)}
  onSuccess={async () => {
    await fetchAll()
    setIsFinancialPaymentOpen(false)
    setSelectedFinancial(null)
    toast.success("Nota marcada como paga!")
  }}
/>
)}
    </>
  )
}
