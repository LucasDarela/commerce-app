"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { fetchEquipments } from "@/lib/fetchEquipments";
import { format, parseISO } from "date-fns";
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
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrendingUp,
} from "@tabler/icons-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Equipment } from "@/components/types/equipments";
import { ExportEquipmentsButton } from "./equipments/ExportEquipmentButton";

//New Schema
export const equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullable().optional(),
  code: z.number().nullable().optional(),
  stock: z.number(),
  value: z.number().nullable().optional(),
  company_id: z.string(),
  is_available: z.boolean().default(true),
  created_at: z.string(),
});

export type CustomColumnDef<TData> = ColumnDef<TData> & {
  meta?: {
    className?: string;
  };
};

// Create a separate component for the drag handle
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

function DraggableRow({ row }: { row: Row<Equipment> }) {
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
          <TableCell
            key={cell.id}
            className={
              (cell.column.columnDef as CustomColumnDef<Equipment>)?.meta
                ?.className
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

export function DataEquipments({
  data: initialData,
  companyId,
}: {
  data: Equipment[];
  companyId: string;
}) {
  const [selectedEquipment, setSelectedEquipment] =
    React.useState<Equipment | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const supabase = createClientComponentClient();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [search, setSearch] = useState("");

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;

    const { error } = await supabase
      .from("equipments")
      .delete()
      .eq("id", equipmentId.toString()); // Garante que é string

    if (error) {
      console.error("Erro ao deletar equipamento:", error);
      toast.error("Erro ao excluir equipamento: " + error.message);
    } else {
      toast.success("Equipamento excluído com sucesso!");
      setEquipments((prev) => prev.filter((eq) => eq.id !== equipmentId));
      if (selectedEquipment?.id === equipmentId) {
        setSelectedEquipment(null);
        setSheetOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!companyId) return;

    async function loadEquipments() {
      const data = await fetchEquipments(companyId);
      setEquipments(data);
      setLoading(false);
    }

    loadEquipments();
  }, [companyId]);

  //const columns
  const columns: CustomColumnDef<Equipment>[] = [
    {
      id: "drag",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: "#",
      meta: { className: "w-[120px]" },
    },
    {
      accessorKey: "name",
      header: "Nome",
      meta: { className: "w-[200px]" },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      meta: { className: "w-[120px]" },
    },
    {
      accessorKey: "stock",
      header: "Estoque",
      meta: { className: "w-[100px] text-right" },
      cell: ({ row }) => row.original.stock,
    },
    {
      accessorKey: "value",
      header: "Valor",
      meta: { className: "w-[100px] text-right" },
      cell: ({ row }) => {
        const value = Number(row.original.value ?? 0);
        return `R$ ${value.toFixed(2).replace(".", ",")}`;
      },
    },
    {
      id: "actions",
      header: "",
      size: 60,
      meta: { className: "w-[60px]" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
            >
              <IconDotsVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedEquipment(row.original);
                setSheetOpen(true);
              }}
            >
              Ver
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/equipments/${row.original.id}/edit`}>
                <span>Editar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDeleteEquipment(row.original.id)}
            >
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
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

  const filteredEquipments = React.useMemo(() => {
    if (!search) return equipments;
    const lowerSearch = search.toLowerCase();

    return equipments.filter(
      (equipment) =>
        equipment.name?.toLowerCase().includes(lowerSearch) ||
        equipment.code?.toLowerCase().includes(lowerSearch),
    );
  }, [search, equipments]);

  const table = useReactTable<Equipment>({
    data: filteredEquipments,
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const oldIndex = equipments.findIndex((item) => item.id === active.id);
    const newIndex = equipments.findIndex((item) => item.id === over.id);

    const newData = arrayMove(equipments, oldIndex, newIndex);

    setEquipments(newData); // Atualiza visualmente imediatamente
    setIsSavingEquipment(true); // Ativa o spinner

    // Atualiza Supabase em paralelo
    Promise.all(
      newData.map((item, index) =>
        supabase
          .from("equipments")
          .update({ order_index: index })
          .eq("id", item.id),
      ),
    )
      .then(() => {
        setIsSavingEquipment(false);
      })
      .catch((err) => {
        console.error("Erro ao atualizar ordem:", err);
        setIsSavingEquipment(false);
      });
  }

  return (
    <>
      {isSavingEquipment && (
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
      <div className="px-6 mt-3">
        <h2 className="text-xl font-bold">Equipamentos</h2>
      </div>

      <Tabs
        defaultValue="outline"
        className="w-full flex-col justify-start gap-6"
      >
        {/* Selector  */}
        <div className="flex items-center justify-between gap-2 px-4 lg:px-6">
          {/* Input que cresce */}
          <div className="flex-grow">
            <Input
              type="text"
              placeholder="Buscar por nome ou código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Botões fixos */}
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
                      column.getCanHide(),
                  )
                  .map((column) => (
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
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/dashboard/equipments/add">
              <Button
                variant="default"
                size="sm"
                className="min-w-[100px] bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <IconPlus className="mr-1" />
                <span className="hidden sm:inline">Equipamento</span>
              </Button>
            </Link>
          </div>
        </div>
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
              <Table className="w-full uppercase">
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={
                              (
                                header.column
                                  .columnDef as CustomColumnDef<Equipment>
                              )?.meta?.className
                            }
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {table.getRowModel().rows?.length ? (
                    <SortableContext
                      items={table
                        .getRowModel()
                        .rows.map((row) => row.original.id)}
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
                    <SheetTitle>Detalhes do Equipamento</SheetTitle>
                    <SheetDescription>
                      Informações sobre o equipamento cadastrado.
                    </SheetDescription>
                  </SheetHeader>

                  {selectedEquipment && (
                    <div className="mt-4 ml-4 flex flex-col gap-2 text-sm">
                      <div>
                        <strong>Nome:</strong> {selectedEquipment.name}
                      </div>
                      <div>
                        <strong>Tipo:</strong>{" "}
                        {(selectedEquipment.type ?? "").toUpperCase()}
                      </div>
                      <div>
                        <strong>Código:</strong> {selectedEquipment.code}
                      </div>
                      <div>
                        <strong>Estoque:</strong> {selectedEquipment.stock}
                      </div>
                      <div>
                        <strong>Valor:</strong> R${" "}
                        {Number(selectedEquipment.value)
                          .toFixed(2)
                          .replace(".", ",")}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        {selectedEquipment.is_available
                          ? "Disponível"
                          : "Indisponível"}
                      </div>
                      <div>
                        <strong>Cadastro:</strong>{" "}
                        {selectedEquipment.created_at
                          ? format(
                              parseISO(selectedEquipment.created_at),
                              "dd/MM/yyyy",
                            )
                          : "—"}
                      </div>
                      <div>
                        <strong>Descrição</strong>{" "}
                        {selectedEquipment.description}
                      </div>
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
                    table.setPageSize(Number(value));
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
          <div className="flex justify-end w-full">
            <ExportEquipmentsButton />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
