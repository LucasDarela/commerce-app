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
  IconLoader,
  IconPlus,
  IconTrendingUp,
} from "@tabler/icons-react"
import clsx from "clsx"
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
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal"
import { fetchEquipmentsForOrderProducts } from "@/lib/fetch-equipments-for-products"
import { ReturnEquipmentModal } from "@/components/equipment-loan/ReturnEquipmentModal"

//New Schema
export const schema = z.object({
  id: z.string(),
  note_number: z.string().optional(),
  document_type: z.string().optional(),
  appointment_date: z.string(),
  appointment_hour: z.string(),
  appointment_local: z.string(),
  customer: z.string(),
  phone: z.string(),
  products: z.string(),
  freight: z.union([z.string(), z.number(), z.null()]).optional(),
  amount: z.number(),
  total: z.number(),
  total_payed: z.number().optional().nullable(),
  delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]),
  payment_status: z.enum(["Pendente", "Pago"]),
  payment_method: z.enum(["Pix", "Dinheiro", "Boleto", "Cartao"]),
  order_index: z.number().nullable().optional(),
  issue_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  customer_signature: z.string().nullable().optional(),
})

type Sale = z.infer<typeof schema>
type Order = z.infer<typeof schema>

type CustomColumnMeta = {
  className?: string
}

type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta
}

type Item = {
  loanId: string;
  equipmentName: string;
  quantity: number;
};

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

function DraggableRow({ row }: { row: Row<Order> }) {
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

async function updateStockBasedOnOrder(order: Order) {
  const items = await parseProductsWithIds(order.products)
  for (const item of items) {
    await supabase.rpc("decrement_stock", {
      product_id: item.id,
      quantity: item.quantity
    })
  }
}

type ParsedProduct = {
  name: string
  quantity: number
}

async function parseProductsWithIds(products: string): Promise<{ id: number, quantity: number }[]> {
  if (!products) return []

  const parsed = products.split(",").map((entry) => {
    const match = entry.trim().match(/^(.+?) \((\d+)x\)$/)
    if (!match) return { name: entry.trim(), quantity: 1 }

    const [, name, quantity] = match
    return { name: name.trim(), quantity: Number(quantity) }
  })

  const names = parsed.map((p) => p.name)
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .in("name", names)

  if (error || !data) {
    console.error("Erro ao buscar IDs dos produtos:", error)
    return []
  }

  return parsed.map((p) => {
    const match = data.find((d) => d.name === p.name)
    return { id: match?.id ?? 0, quantity: p.quantity }
  }).filter(p => p.id !== 0)
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Sale | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const supabase = createClientComponentClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateInput, setDateInput] = useState("")
  const { accessToken, loading: loadingIntegration, error: integrationError } = useCompanyIntegration('mercado_pago')
  const router = useRouter();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const [initialLoanCustomer, setInitialLoanCustomer] = useState<{ id: string; name: string } | undefined>()
const [initialLoanItems, setInitialLoanItems] = useState<any[] | undefined>()

const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
const [returnModalCustomerId, setReturnModalCustomerId] = useState<string | null>(null)
const [returnModalItems, setReturnModalItems] = useState<Item[]>([]) 


  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orders_column_visibility")
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  })

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "") // remove tudo que não é número
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
      table.getColumn("appointment_date")?.setFilterValue(isoDate)
    } else {
      table.getColumn("appointment_date")?.setFilterValue(undefined)
    }
  }

  const refreshOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        note_number,
        document_type,
        appointment_date,
        appointment_hour,
        appointment_local,
        customer,
        phone,
        products,
        freight,
        amount,
        total,
        total_payed,
        delivery_status,
        payment_status,
        payment_method,
        order_index,
        issue_date,
        due_date,
        customer_signature
      `)
      .order("order_index", { ascending: true })
  
    if (error) {
      console.error("Erro ao buscar pedidos:", error)
      return
    }
  
    const parsed = schema.array().safeParse(data)
    if (parsed.success) {
      setOrders(parsed.data)
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

  useEffect(() => {
    async function fetchOrders() {
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
        setOrders(parsed.data)
      } else {
        console.error("Erro ao validar schema Zod:", parsed.error)
      }

      setLoading(false)
    }

    fetchOrders()
  }, [])

  //const columns
  const columns: CustomColumnDef<Order>[] = [
    {
      id: "drag",
      header: () => null,
      size: 25,
      meta: { className: "w-[25px]" },
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "appointment_date",
      header: "Data",
      size: 90,
      meta: { className: "w-[90px]" },
      filterFn: (row, columnId, filterValue) => {
        return row.getValue(columnId) === filterValue
      },
      cell: ({ row }) => {
        const rawDate = row.original.appointment_date
        if (!rawDate) return "—"
        const [year, month, day] = rawDate.split("-")
        return `${day}/${month}/${year}`
      },
    },
    {
      accessorKey: "appointment_hour",
      header: "Hora",
      size: 55,
      meta: { className: "w-[55px]" },
      cell: ({ row }) => row.original.appointment_hour,
    },
    {
      accessorKey: "customer",
      header: "Cliente",
      size: 180,
      meta: { className: "w-[180px] truncate uppercase" },
      cell: ({ row }) => {
        const sale = row.original
        return (
          <Button
            variant="link"
            className="p-0 text-left text-primary hover:underline"
            onClick={() => {
              setSelectedCustomer(sale)
              setSheetOpen(true)
            }}
          >
            {sale.customer}
          </Button>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Tel",
      size: 50,
      meta: { className: "w-[50px]" },
      cell: ({ row }) => {
        const raw = row.original.phone || ""
        const cleaned = raw.replace(/\D/g, "")
        const message = "Olá, tudo bem? Sua entrega de chopp está a caminho."
        const encodedMessage = encodeURIComponent(message)
        const link = `https://wa.me/${cleaned}?text=${encodedMessage}`
    
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
        );
      },
    },
    {
      accessorKey: "products",
      header: "Produtos",
      size: 200,
      meta: { className: "w-[200px] truncate uppercase" },
      cell: ({ row }) => row.original.products,
    },
    {
      accessorKey: "appointment_local",
      header: "Localização",
      size: 150,
      meta: { className: "w-[150px] truncate uppercase" },
      cell: ({ row }) => row.original.appointment_local,
    },
    {
      accessorKey: "delivery_status",
      header: "Delivery",
      size: 90,
      meta: { className: "w-[90px] uppercase" },
      cell: ({ row }) => row.original.delivery_status,
    },
    {
      accessorKey: "issue_date",
      header: "Emissão",
      size: 100,
      meta: { className: "w-[100px]" },
      cell: ({ row }) => row.original.issue_date
        ? format(parseISO(row.original.issue_date), "dd/MM/yyyy")
        : "—",
    },
    {
      accessorKey: "due_date",
      header: "Vencimento",
      size: 100,
      meta: { className: "w-[100px]" },
      cell: ({ row }) => row.original.due_date
        ? format(parseISO(row.original.due_date), "dd/MM/yyyy")
        : "—",
    },
    {
      accessorKey: "payment_method",
      header: "Tipo",
      size: 60,
      meta: { className: "w-[60px] uppercase" },
      cell: ({ row }) => row.original.payment_method,
    },
    {
      accessorKey: "payment_status",
      header: "Pagamento",
      size: 90,
      meta: { className: "w-[90px] uppercase" },
      cell: ({ row }) => row.original.payment_status,
    },
    {
      accessorKey: "remaining",
      header: "Restante",
      size: 100,
      meta: { className: "w-[100px] text-right uppercase" },
      cell: ({ row }) => {
        const { total, total_payed } = row.original
        const remaining = total - (total_payed ?? 0)
        return `R$ ${remaining.toFixed(2).replace(".", ",")}`
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      size: 100,
      meta: { className: "w-[100px] text-right uppercase" },
      cell: ({ row }) => {
        const value = row.original.total
        return `R$ ${value.toFixed(2).replace('.', ',')}`
      },
    },
    {
      id: "actions",
      header: "",
      size: 50,
      meta: { className: "w-[50px]" },
      cell: ({ row }) => (
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
        setSelectedOrder(row.original)
        setIsPaymentOpen(true)
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
      onClick={() => deleteOrderById(row.original.id)}
    >
      Deletar
    </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
      ),
    },
  ]

  const [data, setData] = React.useState(() => initialData)
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
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const table = useReactTable<Order>({
    data: orders,
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

  const futureReservations = React.useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.appointment_date)
      const today = new Date()
      return orderDate > today
    })
  }, [orders])

  async function handleDeliveryStatusUpdate() {
    if (!selectedCustomer) return
  
    let nextStatus: "Coletar" | "Coletado" | null = null
  
    if (selectedCustomer.delivery_status === "Entregar") {
      nextStatus = "Coletar"
    } else if (selectedCustomer.delivery_status === "Coletar") {
      nextStatus = "Coletado"
    }
  
    if (nextStatus) {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_status: nextStatus })
        .eq("id", selectedCustomer.id)
  
      if (!error) {
        // Atualiza o painel lateral
        setSelectedCustomer({
          ...selectedCustomer,
          delivery_status: nextStatus,
        })
  
        // Atualiza a tabela sem recarregar tudo
        setOrders(prev =>
          prev.map(order =>
            order.id === selectedCustomer.id
              ? { ...order, delivery_status: nextStatus! }
              : order
          )
        )
  
        // Atualiza estoque se necessário
        if (nextStatus === "Coletado") {
          await updateStockBasedOnOrder(selectedCustomer)
        }
  
        toast.success(`Status atualizado para ${nextStatus}`)
      } else {
        toast.error("Erro ao atualizar status.")
        console.error(error)
      }
    }
  }

  const isDisabled = !selectedCustomer?.customer_signature || selectedCustomer?.delivery_status === "Coletado"

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
          <div className="px-8">
          <h2 className="text-xl font-bold">Vendas</h2>
      </div>
<div className="grid gap-2 px-4 lg:px-6 py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 items-center">
  {/* Filtro por data */}
  <Input
    type="text"
    inputMode="numeric"
    placeholder="Data"
    value={dateInput}
    onChange={handleDateInput}
    maxLength={10}
    className="min-w-[70px] w-full"
  />

  {/* Nome do cliente */}
  <Input
    placeholder="Buscar cliente..."
    value={(table.getColumn("customer")?.getFilterValue() as string) ?? ""}
    onChange={(e) => table.getColumn("customer")?.setFilterValue(e.target.value)}
    className="min-w-[100px] w-full"
  />

  {/* Status de entrega */}
  <Select
    value={(table.getColumn("delivery_status")?.getFilterValue() as string) ?? ""}
    onValueChange={(value) =>
      table.getColumn("delivery_status")?.setFilterValue(value === "all" ? undefined : value)
    }
  >
    <SelectTrigger className="min-w-[90px] w-full">
      <SelectValue placeholder="Entrega" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="Entregar">Entregar</SelectItem>
      <SelectItem value="Coletar">Coletar</SelectItem>
      <SelectItem value="Coletado">Coletado</SelectItem>
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
      <SelectValue placeholder="Pagamento" />
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
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="Pendente">Pendente</SelectItem>
      <SelectItem value="Pago">Pago</SelectItem>
    </SelectContent>
  </Select>

  {/* Colunas */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="min-w-[100px] w-full">
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
  <Link href="/dashboard/orders/add">
    <Button
      variant="default"
      size="sm"
      className="min-w-[100px] w-full bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <IconPlus className="mr-1" />
      <span className="hidden sm:inline">Venda</span>
    </Button>
  </Link>
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
            <Table className="table-fixed w-full uppercase">
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
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Detalhes do Pedido</SheetTitle>
                <SheetDescription>
                  Detalhes sobre: <strong>{selectedCustomer?.customer}</strong><br/>
                  Nota: <strong>{selectedCustomer?.note_number}</strong><br/>
                  Tipo: <strong>{selectedCustomer?.document_type}</strong><br/>
                  Emissão: <strong>{selectedCustomer?.issue_date}</strong><br/>
                  Vencimento: <strong>{selectedCustomer?.due_date}</strong><br/>
                </SheetDescription>
              </SheetHeader>

    {selectedCustomer && (
      <div className="ml-4 flex flex-col gap-2 text-sm">
        <div>
          <strong>Data de Agendamento:</strong>{" "}
          {selectedCustomer?.appointment_date
            ? format(parseISO(selectedCustomer.appointment_date), "dd/MM/yyyy")
            : "—"}
        </div>
        <div><strong>Hora:</strong> {selectedCustomer.appointment_hour}</div>
        <div><strong>Nome:</strong> {selectedCustomer.customer}</div>
          {selectedCustomer?.phone && (
              <div>
                <strong>Telefone:</strong>{" "}
                <a
                  href={`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Olá, tudo bem? Sua entrega de chopp está a caminho.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {selectedCustomer.phone}
                </a>
              </div>
            )}
        <div><strong>Produtos:</strong><br/> {selectedCustomer.products}</div>
        <div><strong>Quantidade:</strong> {selectedCustomer.amount}</div>
        <div><strong>Localização:</strong> {selectedCustomer.appointment_local}</div>
        <div><strong>Frete:</strong> {selectedCustomer.freight}</div>
        <div><strong>Total:</strong> {selectedCustomer.total}</div>
        <div><strong>Forma de Pagamento:</strong> {selectedCustomer.payment_method}</div>
        <div><strong>Delivery:</strong> {selectedCustomer.delivery_status}</div>
        <div><strong>Pagamento:</strong> {selectedCustomer.payment_status}</div>

        <Button
          className="mt-6"
          onClick={() => {
            if (selectedCustomer?.id) {
              router.push(`/dashboard/orders/${selectedCustomer.id}/view`);
            }
          }}
        >
          Ver Espelho
        </Button>

        <Button
          className={clsx({
            "bg-muted text-muted-foreground cursor-not-allowed opacity-60": isDisabled,
          })}
          disabled={isDisabled}
          onClick={async () => {
            if (!selectedCustomer?.customer_signature) {
              toast.warning("⚠️ O cliente precisa assinar antes de marcar como entregue."); 
              return;
            }

            if (selectedCustomer?.delivery_status === "Coletado") {
              return;
            }

            if (selectedCustomer.delivery_status === "Entregar") {
              const equipmentItems = await fetchEquipmentsForOrderProducts(selectedCustomer.products)
              const { data: matchingCustomer, error: customerError } = await supabase
                .from("customers")
                .select("id, name")
                .eq("name", selectedCustomer.customer)
                .maybeSingle()

              if (!matchingCustomer || customerError) {
                toast.error("Cliente não encontrado na tabela de clientes.")
                return
              }

              setInitialLoanCustomer({ id: matchingCustomer.id, name: matchingCustomer.name })
              setInitialLoanItems(equipmentItems)
              setIsLoanModalOpen(true)
            }

            else if (selectedCustomer.delivery_status === "Coletar") {
              const { data: matchingCustomer, error: customerError } = await supabase
                .from("customers")
                .select("id, name")
                .eq("name", selectedCustomer.customer)
                .maybeSingle()
            
              if (!matchingCustomer || customerError) {
                toast.error("Cliente não encontrado na tabela de clientes.")
                return
              }
            
              const { data: loans, error } = await supabase
                .from("equipment_loans")
                .select("id, quantity, equipment:equipments(name)")
                .eq("customer_id", matchingCustomer.id) 
                .eq("status", "active")
            
              if (error || !loans) {
                toast.error("Erro ao buscar itens para retorno")
                return
              }
            
              const formatted = loans.map((loan) => ({
                loanId: loan.id,
                equipmentName: loan.equipment?.[0]?.name || "Equipamento",
                quantity: loan.quantity,
              }))
            
              if (formatted.length === 0) {
                toast.warning("Nenhum item de empréstimo encontrado para retornar.")
                return
              }
            
              setReturnModalItems(formatted)
              setReturnModalCustomerId(matchingCustomer.id)
              setIsReturnModalOpen(true)
            }

            else {
              handleDeliveryStatusUpdate()
            }
          }}
        >
          {selectedCustomer?.delivery_status === "Entregar" && "Marcar como Entregue"}
          {selectedCustomer?.delivery_status === "Coletar" && "Coletar Itens"}
          {selectedCustomer?.delivery_status === "Coletado" && "Chopp já Coletado ✅"}
          {!selectedCustomer?.delivery_status && "Atualizar Status"}
        </Button>

      </div>
    )}
  </SheetContent>
</Sheet>
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
<LoanEquipmentModal
  open={isLoanModalOpen}
  onOpenChange={setIsLoanModalOpen}
  onLoanSaved={() => {
    setIsLoanModalOpen(false)
    handleDeliveryStatusUpdate()
    refreshOrders()
  }}
  initialCustomer={initialLoanCustomer}
  initialItems={initialLoanItems}
/>

{isReturnModalOpen && returnModalItems.length > 0 && (
  <ReturnEquipmentModal
    open={isReturnModalOpen}
    onOpenChange={setIsReturnModalOpen}
    customerId={returnModalCustomerId}
    items={returnModalItems}
    onReturnSuccess={() => {
      setIsReturnModalOpen(false)
      handleDeliveryStatusUpdate()
      refreshOrders()
    }}
  />
)}
    </>
  )
}