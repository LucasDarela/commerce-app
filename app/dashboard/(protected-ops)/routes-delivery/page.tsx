"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useCompanyIntegration } from "@/hooks/use-company-integration";
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
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import clsx from "clsx";
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
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PaymentModal } from "@/components/payment-modal";
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal";
import { fetchEquipmentsForOrderProducts } from "@/lib/fetch-equipments-for-products";
import { ReturnEquipmentModal } from "@/components/equipment-loan/ReturnEquipmentModal";
import { getTranslatedStatus } from "@/utils/getTranslatedStatus";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CustomDateInput from "@/components/ui/CustomDateInput";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { parseOrderProducts } from "@/lib/orders/parseOrderProducts";
import type { Equipment } from "@/components/types/equipments";
import type { ProductItem } from "@/components/types/products";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { orderSchema, type Order } from "@/components/types/orderSchema";
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DriverSelect from "@/components/routes/SelectMotorista";

type Sale = z.infer<typeof orderSchema>;

type DataTableProps = {
  data: z.infer<typeof orderSchema>[];
  companyId: string;
  onRowClick?: (order: z.infer<typeof orderSchema>) => void;
};

type CustomColumnMeta = {
  className?: string;
};

type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta;
};

type Item = {
  loanId: string;
  equipmentName: string;
  quantity: number;
};

export type ReturnEquipmentItem = {
  loanId: string;
  equipmentName: string;
  quantity: number;
};

type Delivery = {
  id: string;
  name: string;
  address: string;
  order: string;
  selected?: boolean;
};

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id });

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
  );
}

function DraggableRow({
  row,
  onClick,
}: {
  row: Row<Order>;
  onClick?: (order: Order) => void;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onClick?.(row.original)} // ✅ aplica o clique aqui
    >
      {row.getVisibleCells().map((cell) => {
        const isDragCell = cell.column.id === "drag";

        return (
          <TableCell
            key={cell.id}
            className={
              (cell.column.columnDef as CustomColumnDef<Order>)?.meta?.className
            }
          >
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

async function updateStockBasedOnOrder(
  supabaseClient: SupabaseClient,
  order: Order,
) {
  const items = await parseProductsWithIds(supabaseClient, order.products);
  for (const item of items) {
    await supabaseClient.rpc("decrement_stock", {
      product_id: item.id,
      quantity: item.quantity,
    });
  }
}

type ParsedProduct = {
  name: string;
  quantity: number;
};

async function parseProductsWithIds(
  supabaseClient: SupabaseClient,
  products: string,
): Promise<{ id: number; quantity: number }[]> {
  if (!products) return [];

  const parsed = products.split(",").map((entry) => {
    const match = entry.trim().match(/^(.+?) \((\d+)x\)$/);
    if (!match) return { name: entry.trim(), quantity: 1 };
    const [, name, quantity] = match;
    return { name: name.trim(), quantity: Number(quantity) };
  });

  const names = parsed.map((p) => p.name);
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name")
    .in("name", names);

  if (error || !data) {
    console.error("Erro ao buscar IDs dos produtos:", error);
    return [];
  }

  return parsed
    .map((p) => {
      const match = data.find((d) => d.name === p.name);
      return { id: match?.id ?? 0, quantity: p.quantity };
    })
    .filter((p) => p.id !== 0);
}

export default function RoutesTable({
  data: initialData,
  companyId,
  onRowClick,
}: DataTableProps) {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Sale | null>(
    null,
  );
  const { user } = useAuthenticatedCompany();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [returnedProducts, setReturnedProducts] = useState<
    { name: string; quantity: number }[]
  >([]);
  const {
    accessToken,
    loading: loadingIntegration,
    error: integrationError,
  } = useCompanyIntegration("mercado_pago");
  const router = useRouter();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [initialLoanCustomer, setInitialLoanCustomer] = useState<
    { id: string; name: string } | undefined
  >();
  const [initialLoanItems, setInitialLoanItems] = useState<any[] | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnModalCustomerId, setReturnModalCustomerId] = useState<
    string | null
  >(null);
  const [returnEquipmentItems, setReturnEquipmentItems] = useState<
    ReturnEquipmentItem[]
  >([]);
  const [returnProductItems, setReturnProductItems] = useState<ProductItem[]>(
    [],
  );
  const [isProductReturnModalOpen, setIsProductReturnModalOpen] =
    useState(false);
  const [issueDateFilter, setissueDateFilter] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedDriver, setSelectedDriver] = useState<string | undefined>();
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("orders_column_visibility");
        return stored ? JSON.parse(stored) : {};
      }
      return {};
    },
  );

  const handleGenerateRoute = () => {
    const selectedDeliveries = deliveries.filter((d) => d.selected);
    if (selectedDeliveries.length === 0) {
      toast.warning("Selecione pelo menos uma entrega para gerar a rota!");
      return;
    }

    // lógica de geração de rota aqui
  };

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    const parts = [];
    if (value.length > 0) parts.push(value.slice(0, 2));
    if (value.length > 2) parts.push(value.slice(2, 4));
    if (value.length > 4) parts.push(value.slice(4, 8));

    const formatted = parts.join("/");
    setDateInput(formatted);

    if (formatted.length === 10) {
      const [day, month, year] = formatted.split("/");
      const isoDate = `${year}-${month}-${day}`;
      table.getColumn("appointment_date")?.setFilterValue(isoDate);
    } else {
      table.getColumn("appointment_date")?.setFilterValue(undefined);
    }
  }

  const refreshOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        customer_id,
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
        customer_signature,
        text_note,
        boleto_id,
        customer_rel:customers!sales_customer_id_fkey (
          id,
          name,
          fantasy_name,
          emit_nf
        )
      `,
      )
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return;
    }

    const ordersWithFantasy = (data ?? []).map((r) => {
      const cr = (r as any).customer_rel;
      const fantasyName = Array.isArray(cr)
        ? cr[0]?.fantasy_name
        : cr?.fantasy_name;

      return {
        ...r,
        fantasy_name: fantasyName || "",
      };
    });

    console.log("🔹 ordersWithFantasy", ordersWithFantasy);

    const parsedOrders = orderSchema.array().safeParse(ordersWithFantasy);
    if (parsedOrders.success) {
      setOrders(parsedOrders.data);
    } else {
      console.error("Erro ao validar schema Zod:", parsedOrders.error);
    }

    console.table(
      (data ?? []).map((r) => {
        const cr = (r as any).customer_rel;
        const crEmit = Array.isArray(cr) ? cr[0]?.emit_nf : cr?.emit_nf; // 👈 cobre os 2 casos
        return {
          id: r.id,
          order_emit_nf: (r as any).emit_nf,
          customer_emit_nf: crEmit,
          typeof_order_emit_nf: typeof (r as any).emit_nf,
          typeof_customer_emit_nf: typeof crEmit,
        };
      }),
    );

    console.log("orders payload", JSON.parse(JSON.stringify(data)));

    const parsed = orderSchema.array().safeParse(data);
    if (parsed.success) {
      setOrders(parsed.data);
    } else {
      console.error("Erro ao validar schema Zod:", parsed.error);
    }
  };

  const restoreStockBeforeDelete = async (orderId: string) => {
    const { data: items, error: fetchError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (fetchError) {
      console.error("Erro ao buscar itens antes da exclusão:", fetchError);
      return;
    }

    for (const item of items ?? []) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        console.error("Erro ao buscar estoque do produto:", productError);
        continue;
      }

      const newStock = (product?.stock ?? 0) + item.quantity;

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Erro ao atualizar estoque:", updateError);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "orders_column_visibility",
        JSON.stringify(columnVisibility),
      );
    }
  }, [columnVisibility]);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
      }

      const parsed = orderSchema.array().safeParse(data);
      if (parsed.success) {
        setOrders(parsed.data);
      } else {
        console.error("Erro ao validar schema Zod:", parsed.error);
      }

      setLoading(false);
    }

    fetchOrders();
  }, []);

  const columns: CustomColumnDef<Order>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 25,
      meta: { className: "w-[25px]" },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "appointment_date",
      header: "Data",
      size: 90,
      meta: { className: "w-[90px]" },
      filterFn: (row, columnId, filterValue) => {
        const rowDate = row.getValue<string>(columnId);
        if (!rowDate || typeof rowDate !== "string") return false;

        const rowTime = new Date(rowDate).getTime();

        if (typeof filterValue === "string") {
          return rowDate === filterValue;
        }

        if (filterValue?.from && filterValue?.to) {
          const fromTime = new Date(filterValue.from).getTime();
          const toTime = new Date(filterValue.to).getTime();
          return rowTime >= fromTime && rowTime <= toTime;
        }

        return true;
      },
      cell: ({ row }) => {
        const rawDate = row.original.appointment_date;
        if (!rawDate) return "—";
        const [year, month, day] = rawDate.split("-");
        return `${day}/${month}/${year}`;
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
      size: 200,
      meta: { className: "w-[200px] truncate uppercase" },
      cell: ({ row }) => {
        const saleId = row.original.id;
        const orderWithFantasy = orders.find((o) => o.id === saleId);

        console.log("🔹 row.original", row.original); // log do que a tabela tem
        console.log("🔹 orderWithFantasy", orderWithFantasy); // log do objeto atualizado com fantasy_name

        return (
          <Button
            variant="link"
            className="p-0 text-left text-primary hover:underline"
            onClick={() => {
              if (orderWithFantasy) {
                setSelectedCustomer(orderWithFantasy);
                setSheetOpen(true);
              }
            }}
          >
            {orderWithFantasy?.customer}
          </Button>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Tel",
      size: 50,
      meta: { className: "w-[50px]" },
      cell: ({ row }) => {
        const raw = row.original.phone || "";
        const cleaned = raw.replace(/\D/g, "");
        const message = "Olá, tudo bem? Sua entrega de chopp está a caminho.";
        const encodedMessage = encodeURIComponent(message);

        const handleClick = (e: React.MouseEvent) => {
          if (!cleaned) {
            e.preventDefault();
            toast.warning("⚠️ Cliente sem número de telefone cadastrado.");
          }
        };

        const link = `https://wa.me/${cleaned}?text=${encodedMessage}`;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClick}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 32 32"
                    className="text-primary hover:text-primary/80 fill-current transition-transform hover:scale-110"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d=" M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.955 8.955 0 0 1-1.72-5.272c0-4.955 4.04-8.995 8.997-8.995S25.2 10.845 25.2 15.8c0 4.958-4.04 8.998-8.998 8.998zm0-19.798c-5.96 0-10.8 4.842-10.8 10.8 0 1.964.53 3.898 1.546 5.574L5 27.176l5.974-1.92a10.807 10.807 0 0 0 16.03-9.455c0-5.958-4.842-10.8-10.802-10.8z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                {cleaned ? "Enviar mensagem via WhatsApp" : "Sem telefone"}
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
      meta: { className: "w-[300px]" },
      cell: ({ row }) => (
        <div className="leading-tight whitespace-pre-line break-words uppercase">
          {row.original.products}
        </div>
      ),
    },
    {
      accessorKey: "text_note",
      header: "Observação",
      size: 250,
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => (
        <div className="whitespace-pre-wrap lowercase text-muted-foreground">
          {row.original.text_note || ""}
        </div>
      ),
    },
    {
      accessorKey: "appointment_local",
      header: "Localização",
      size: 350,
      meta: { className: "w-[350px]" },
      cell: ({ row }) => (
        <div className="whitespace-pre-wrap lowercase text-muted-foreground">
          {row.original.appointment_local || ""}
        </div>
      ),
    },
    {
      accessorKey: "delivery_status",
      header: "Delivery",
      size: 100,
      meta: { className: "w-[100px] uppercase" },
      cell: ({ row }) => row.original.delivery_status,
    },
    {
      accessorKey: "payment_method",
      header: "Tipo",
      size: 80,
      meta: { className: "w-[80px] uppercase" },
      cell: ({ row }) => row.original.payment_method,
    },
    {
      accessorKey: "payment_status",
      header: "Pagamento",
      size: 100,
      meta: { className: "w-[100px] uppercase" },
      filterFn: "equals",
      cell: ({ row }) => {
        const payment_status = row.original.payment_status;
        return getTranslatedStatus({ source: "order", payment_status });
      },
    },
    {
      accessorKey: "remaining",
      header: "Restante",
      size: 100,
      meta: { className: "w-[100px] text-right uppercase" },
      cell: ({ row }) => {
        const { total, total_payed } = row.original;
        const remaining = total - (total_payed ?? 0);
        return `R$ ${remaining.toFixed(2).replace(".", ",")}`;
      },
    },
    {
      id: "actions",
      header: "",
      size: 50,
      meta: { className: "w-[50px]" },
      cell: ({ row }) => {},
    },
  ];

  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  const table = useReactTable<Order>({
    data: React.useMemo(() => {
      return orders.filter((order) => {
        if (!order.appointment_date) return false;
        return order.appointment_date.startsWith(selectedMonth);
      });
    }, [orders, selectedMonth]),
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
  });

  const futureReservations = React.useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.appointment_date);
      const today = new Date();
      return orderDate > today;
    });
  }, [orders]);

  async function handleDeliveryStatusUpdate() {
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

        setOrders((prev) =>
          prev.map((order) =>
            order.id === selectedCustomer.id
              ? { ...order, delivery_status: nextStatus! }
              : order,
          ),
        );

        if (nextStatus === "Coletado") {
          await updateStockBasedOnOrder(supabase, selectedCustomer);
        }
      } else {
        toast.error("Erro ao atualizar status.");
        console.error(error);
      }
    }
  }

  async function fetchOrderProductsForReturnModal(orderId: string) {
    const { data, error } = await supabase
      .from("order_items")
      .select("product_id, quantity, products(name)")
      .eq("order_id", orderId);

    if (error || !data) {
      toast.error("Erro ao buscar produtos da venda");
      return;
    }

    const formatted = data.map((item) => ({
      id: String(item.product_id),
      name: (item as any).products.name,
      quantity: item.quantity,
    }));

    setReturnProductItems(formatted);
    setIsProductReturnModalOpen(true);
  }

  async function fetchReturnedProducts(orderId: string) {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("product_id, quantity, products(name)")
      .eq("note_id", orderId)
      .eq("type", "return");

    if (error || !data) {
      console.error("Erro ao buscar produtos devolvidos:", error);
      return [];
    }

    return data.map((item) => ({
      name: (item as any).products.name,
      quantity: item.quantity,
    }));
  }

  const monthsAvailable = React.useMemo(() => {
    const unique = new Set<string>();
    for (const order of orders) {
      if (order.appointment_date) {
        const [year, month] = order.appointment_date.split("-");
        unique.add(`${year}-${month}`);
      }
    }
    return Array.from(unique).sort().reverse();
  }, [orders]);

  useEffect(() => {
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0];
      table.getColumn("appointment_date")?.setFilterValue(formatted);
    } else {
      table.getColumn("appointment_date")?.setFilterValue(undefined);
    }
  }, [selectedDate, table]);

  useEffect(() => {
    async function loadReturns() {
      if (selectedCustomer?.id) {
        const products = await fetchReturnedProducts(selectedCustomer.id);
        setReturnedProducts(products);
      }
    }

    loadReturns();
  }, [selectedCustomer]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          setOrders((prev) => {
            const next = Array.isArray(prev) ? [...prev] : [];

            const newRow = (payload.new ?? {}) as { id?: string };
            const oldRow = (payload.old ?? {}) as { id?: string };
            const rowId = newRow.id ?? oldRow.id;

            const idx =
              rowId != null ? next.findIndex((o) => o.id === rowId) : -1;

            switch (payload.eventType) {
              case "INSERT": {
                if (idx === -1) next.unshift(payload.new as any); // tipar se tiver seu tipo Order
                return next;
              }
              case "UPDATE": {
                if (idx !== -1)
                  next[idx] = { ...next[idx], ...(payload.new as any) };
                return next;
              }
              case "DELETE": {
                if (idx !== -1) next.splice(idx, 1);
                return next;
              }
              default:
                return prev;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload) => {
          const oldRow = payload.old as { id: string; company_id?: string };
          if (oldRow?.company_id && oldRow.company_id !== companyId) return;
          setData((prev) => prev.filter((o) => o.id !== oldRow.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow?.company_id && newRow.company_id !== companyId) return;
          setData((prev) => {
            if (prev.some((o) => o.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow?.company_id && newRow.company_id !== companyId) return;
          setData((prev) =>
            prev.map((o) => (o.id === newRow.id ? { ...o, ...newRow } : o)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, setData]);

  const isDisabled =
    !selectedCustomer?.customer_signature ||
    selectedCustomer?.delivery_status === "Coletado";

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;

  const handleFilter = (range: [Date | null, Date | null]) => {
    setDateRange(range);

    const isoStart = range[0]?.toISOString().split("T")[0];
    const isoEnd = range[1]?.toISOString().split("T")[0];

    table.getColumn("appointment_date")?.setFilterValue({
      from: isoStart,
      to: isoEnd,
    });
  };

  const clearFilter = () => {
    setDateRange([null, null]);
    table.getColumn("appointment_date")?.setFilterValue(undefined);
  };

  if (loading) {
    return <TableSkeleton />;
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
      <div className="w-full flex justify-between items-center px-4 lg:px-6 my-2">
        <h2 className="text-xl font-bold">Todas as Rotas</h2>
      </div>
      <div className="grid gap-2 px-4 lg:px-6 py-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-center">
        {/* Filtro por data */}
        <div className="relative w-full">
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update) =>
              handleFilter(update as [Date | null, Date | null])
            }
            isClearable={false}
            placeholderText="Filtrar por Período de Entrega"
            dateFormat="dd/MM/yyyy"
            customInput={<CustomDateInput />}
            popperPlacement="bottom-start"
            popperClassName="z-[9999]"
          />

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setDateRange([null, null]);
                table.getColumn("appointment_date")?.setFilterValue(undefined);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-600"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          )}
        </div>

        <DriverSelect />

        <Select
          value={
            (table.getColumn("delivery_status")?.getFilterValue() as string) ??
            ""
          }
          onValueChange={(value) =>
            table
              .getColumn("delivery_status")
              ?.setFilterValue(value === "all" ? undefined : value)
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
        <Link href="/dashboard/routes-delivery/create">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span>Criar Nova Rota</span>
          </Button>
        </Link>
      </div>

      {/* Cards  */}

      <Card className="m-4 w-auto">
        <CardContent className="flex items-center justify-between">
          <h2>Motorista 01</h2>
          <p>Rota 1</p>
          <Button>Ver Rota</Button>
        </CardContent>
      </Card>
    </>
  );
}
