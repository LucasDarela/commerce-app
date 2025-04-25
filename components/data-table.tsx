"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { useEffect, useState } from "react"
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
  freight: z.union([z.string(), z.number()]).optional().nullable(),
  amount: z.number(),
  total: z.number(),
  total_payed: z.number().optional().nullable(),
  delivery_status: z.enum(["Entregar", "Coletar", "Coletado"]),
  payment_status: z.enum(["Pendente", "Pago"]),
  payment_method: z.enum(["Pix", "Dinheiro", "Boleto", "Cartao"]),
  order_index: z.number().nullable().optional(),
})

type Sale = z.infer<typeof schema>
type Order = z.infer<typeof schema>

type CustomColumnMeta = {
  className?: string
}

type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta
}

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
  const router = useRouter();

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
        const link = `https://wa.me/55${cleaned}?text=${encodedMessage}`
    
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
    <DropdownMenuItem>
    <button
      onClick={async () => {
        try {
         // 1. Buscar os dados do pedido completo
    const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      customers:customers(*)
    `)
    .eq("id", row.original.id)
    .single();

  if (!order || !order.customers) {
    toast.error("Dados do cliente não encontrados.");
    return;
  }

  const cliente = order.customers;

  // 2. Enviar para o create-payment com os dados corretos
  const payload = {
    nome: cliente.name,
    document: cliente.document,
    email: cliente.email,
    total: order.total,
    days_ticket: order.days_ticket,
    order_id: order.id,
    zip_code: cliente.zip_code,
    address: cliente.address,
    number: cliente.number,
    neighborhood: cliente.neighborhood,
    city: cliente.city,
    state: cliente.state,
  };

  const res = await fetch("/api/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    toast.error("Erro ao gerar boleto");
    console.error("❌ Erro:", error);
    return;
  }

  toast.success("Boleto gerado!");
  router.push(`/dashboard/orders/${row.original.id}/boleto`);
} catch (err) {
  toast.error("Erro inesperado");
  console.error("❌ Erro inesperado:", err);
}
      }}
      disabled={row.original.payment_method.toLowerCase() !== "boleto"}
    >
      Gerar Boleto
    </button>
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
<div className="grid gap-3 px-2 sm:px-4 py-2
  grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7
  items-center"
>
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
      <span className="hidden sm:inline">Add Venda</span>
    </Button>
  </Link>
</div>


    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      {/* Selector  */}
      {/* <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={"/dashboard/orders/add"}>
          <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear">
            <IconPlus />
            <span className="hidden lg:inline">Adicionar Venda</span>
          </Button>
          </Link>
        </div>
      </div> */}
      {/* Delivery Tabs  */}
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
                </SheetDescription>
              </SheetHeader>

    {selectedCustomer && (
      <div className="mt-4 ml-4 flex flex-col gap-2 text-sm">
        <div>
          <strong>Data:</strong>{" "}
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
            variant={selectedCustomer?.delivery_status === "Coletado" ? "secondary" : "default"}
            disabled={selectedCustomer?.delivery_status === "Coletado"}
            onClick={async () => {
              if (!selectedCustomer) return;

              let nextStatus: "Coletar" | "Coletado" | null = null;

              if (selectedCustomer.delivery_status === "Entregar") {
                nextStatus = "Coletar";
              } else if (selectedCustomer.delivery_status === "Coletar") {
                nextStatus = "Coletado";
              }

              if (nextStatus) {
                const { error } = await supabase
                  .from("orders")
                  .update({ delivery_status: nextStatus })
                  .eq("id", selectedCustomer.id);

                if (!error) {
                  setSelectedCustomer({
                    ...selectedCustomer,
                    delivery_status: nextStatus,
                  });
                  toast.success(`Status atualizado para ${nextStatus}`);
                } else {
                  toast.error("Erro ao atualizar status.");
                  console.error(error);
                }
              }
            }}
          >
            {selectedCustomer?.delivery_status === "Entregar" && "Marcar como Entregue"}
            {selectedCustomer?.delivery_status === "Coletar" && "Marcar como Coletado"}
            {selectedCustomer?.delivery_status === "Coletado" && "Chopp já Coletado ✅"}
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
      {/* To Collect Tabs  */}
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
          <h1>To Collect</h1>
        </div>
      </TabsContent>
      {/* Pendign Payment Tabs */}
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
        <h1>To Payment</h1>
        </div>
      </TabsContent>
      {/* Focus Document Tabs  */}
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
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
    </>
  )
}