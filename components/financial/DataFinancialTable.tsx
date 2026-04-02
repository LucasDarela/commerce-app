import * as React from "react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCompanyIntegration } from "@/hooks/use-company-integration";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { PaymentModal } from "@/components/payment-modal";
import { YourFinancialRecords } from "@/components/your-financial-modal";
import { DataTableConfig } from "./DataTableConfig";
import { FinancialFilters as Filters } from "./Filters";
import { HeaderActions } from "./HeaderActions";
import { PaymentSheet } from "./PaymentSheet";
import { mapToFinancialPaymentMethod, groupByDueMonth } from "./utils";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { financialColumns } from "./columns";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { isOrder } from "./utils";
import {
  getInitialColumnVisibility,
  persistColumnVisibility,
} from "./table-config";
import { FinancialPaymentModal } from "./PaymentModal";
import { exportTableToCSV } from "@/lib/exportCsv";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { MonthlyFinancialTable } from "./MonthlyFinancialTable";
import { orderSchema, type Order } from "@/components/types/orderSchema";
import { financialSchema, type FinancialRecord } from "./schema";
import type { CombinedRecord, InvoiceStatus } from "./types";

type PersistedState = {
  selectedMonth?: string;
  columnFilters?: ColumnFiltersState;
  dateRange?: [string | null, string | null];
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readPersistedState<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function toISO(d: Date | null) {
  return d ? d.toISOString().split("T")[0] : null;
}

export default function DataFinancialTable() {
  const { companyId } = useAuthenticatedCompany();
  useEffect(() => {});
  const [orders, setOrders] = useState<Order[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    [],
  );
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
const [selectedOrder, setSelectedOrder] = useState<CombinedRecord | null>(null);
  const [selectedFinancial, setSelectedFinancial] =
    useState<FinancialRecord | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isFinancialPaymentOpen, setIsFinancialPaymentOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(
    getInitialColumnVisibility,
  );
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const [issueDateInput, setIssueDateInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");

  const router = useRouter();

  const [nfeStatusByOrderId, setNfeStatusByOrderId] = useState<
  Record<string, InvoiceStatus | null>
>({});

const [boletoStatusByOrderId, setBoletoStatusByOrderId] = useState<
  Record<string, boolean>
>({});

  const handleUpdateRecord = (id: string) => {
    setFinancialRecords((prev) =>
      prev.map((record) =>
        record.id === id ? { ...record, status: "Paid" } : record,
      ),
    );
  };


const fetchAll = useCallback(async () => {
  if (!companyId) {
    setOrders([]);
    setFinancialRecords([]);
    setSuppliers([]);
    setNfeStatusByOrderId({});
    setBoletoStatusByOrderId({});
    setLoading(false);
    return;
  }

  setLoading(true);

  const [ordersRes, financialRes, suppliersRes, invoicesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("company_id", companyId)
      .order("order_index", { ascending: true }),

    supabase
      .from("financial_records")
      .select("*")
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false }),

    supabase
      .from("suppliers")
      .select("id, name")
      .eq("company_id", companyId),

    supabase
      .from("invoices")
      .select("order_id, status")
      .eq("company_id", companyId),
  ]);

  const parsedOrders = orderSchema
    .array()
    .safeParse(
      (ordersRes.data ?? []).map((o) => ({
        ...o,
        source: "order" as const,
      })),
    );

  const boletoMap: Record<string, boolean> = {};
  for (const order of ordersRes.data ?? []) {
    boletoMap[String((order as any).id)] =
      Boolean((order as any).boleto_url) || Boolean((order as any).boleto_id);
  }
  setBoletoStatusByOrderId(boletoMap);

  if (parsedOrders.success) {
    setOrders(parsedOrders.data);
  } else {
    console.error("Erro ao validar orders:", parsedOrders.error);
    setOrders([]);
  }

  const nfeMap: Record<string, InvoiceStatus | null> = {};

  for (const inv of invoicesRes.data ?? []) {
    if (!inv.order_id) continue;
    nfeMap[String(inv.order_id)] = (inv.status as InvoiceStatus) ?? null;
  }

  setNfeStatusByOrderId(nfeMap);

  const mappedFinancials = (financialRes.data ?? []).map((f) => ({
    ...f,
    payment_method:
      f.payment_method === "Cash"
        ? "Dinheiro"
        : f.payment_method === "Card"
          ? "Cartao"
          : f.payment_method === "Ticket"
            ? "Boleto"
            : f.payment_method ?? undefined,
    total_payed: Number(f.total_payed ?? 0),
    source: "financial" as const,
  }));

  const validFinancials: FinancialRecord[] = [];

  for (const item of mappedFinancials) {
    const parsed = financialSchema.safeParse(item);

    if (parsed.success) {
      validFinancials.push(parsed.data);
    } else {
      console.error("Registro financeiro inválido:", item);
      console.error(parsed.error.flatten());
    }
  }

  setFinancialRecords(validFinancials);
  setSuppliers(suppliersRes.data || []);
  setLoading(false);
}, [companyId, supabase]);

const refreshOrders = async () => {
  if (!companyId) return;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("company_id", companyId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Erro ao recarregar orders:", error);
    return;
  }

  const parsed = orderSchema.array().safeParse(
    (data ?? []).map((o) => ({ ...o, source: "order" as const })),
  );

  if (parsed.success) {
    setOrders(parsed.data);
  } else {
    console.error("Erro ao validar orders no refresh:", parsed.error);
  }
};

const deleteOrderById = useCallback(
  async ({
    id,
    table,
    deleteRecurring,
    recurrenceGroupId,
  }: {
    id: string;
    table: "orders" | "financial_records";
    deleteRecurring?: boolean;
    recurrenceGroupId?: string | null;
  }) => {
    if (table === "financial_records") {
      if (deleteRecurring && recurrenceGroupId) {
        setFinancialRecords((prev) =>
          prev.filter((r: any) => r.recurrence_group_id !== recurrenceGroupId),
        );

        await fetchAll();
        return;
      }

      setFinancialRecords((prev) => prev.filter((r) => r.id !== id));
      await fetchAll();
      return;
    }

    setOrders((prev) => prev.filter((r) => r.id !== id));
    await fetchAll();
  },
  [fetchAll],
);

const columns = useMemo(
  () =>
    financialColumns({
      suppliers,
      onDelete: deleteOrderById,
      setSelectedOrder,
      setIsPaymentOpen,
      nfeStatusByOrderId,
      boletoStatusByOrderId,
    }),
  [
    suppliers,
    deleteOrderById,
    setSelectedOrder,
    setIsPaymentOpen,
    nfeStatusByOrderId,
    boletoStatusByOrderId,
  ],
);

useEffect(() => {
  if (!companyId) return;
  fetchAll();
}, [companyId]);

  useEffect(() => {
    persistColumnVisibility(columnVisibility);
  }, [columnVisibility]);

const combinedData: CombinedRecord[] = useMemo(() => {
  return [
    ...orders.map(
      (o): CombinedRecord => ({
        ...o,
        source: "order",
        has_boleto: boletoStatusByOrderId[String(o.id)] ?? false,
        has_nfe: !!nfeStatusByOrderId[String(o.id)],
      }),
    ),
    ...financialRecords.map(
      (f): CombinedRecord => ({
        ...f,
        source: "financial",
        has_boleto: false,
        has_nfe: false,
      }),
    ),
  ];
}, [orders, financialRecords, nfeStatusByOrderId, boletoStatusByOrderId]);

  // ✅ Calcular agrupamento e ordenar os meses
  const groupedByMonth = useMemo(
    () => groupByDueMonth(combinedData),
    [combinedData],
  );

  const monthKeysSorted = useMemo(() => {
    return Object.keys(groupedByMonth).sort((a, b) => {
      const [aMonth, aYear] = a.split("/").map(Number);
      const [bMonth, bYear] = b.split("/").map(Number);
      return (
        new Date(bYear, bMonth - 1).getTime() -
        new Date(aYear, aMonth - 1).getTime()
      );
    });
  }, [groupedByMonth]);

  const STORAGE_KEY = "financial_table_state_v3:global";

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const fallback = `${month}/${year}`;

    const saved = readPersistedState<PersistedState>(STORAGE_KEY);
    return saved?.selectedMonth ?? fallback;
  });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const saved = readPersistedState<PersistedState>(STORAGE_KEY);
    return saved?.columnFilters ?? [];
  });

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => {
    const saved = readPersistedState<PersistedState>(STORAGE_KEY);
    const [startISO, endISO] = saved?.dateRange ?? [null, null];

    return [
      startISO ? new Date(`${startISO}T00:00:00`) : null,
      endISO ? new Date(`${endISO}T00:00:00`) : null,
    ];
  });

  useEffect(() => {
    const [start, end] = dateRange;
    const from = start ? start.toISOString().split("T")[0] : undefined;
    const to = end ? end.toISOString().split("T")[0] : undefined;

    setColumnFilters((prev) => {
      const withoutDue = prev.filter((f) => f.id !== "due_date");
      if (!from && !to) return withoutDue;
      return [...withoutDue, { id: "due_date", value: { from, to } }];
    });
  }, [dateRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedState = {
      selectedMonth,
      columnFilters,
      dateRange: [toISO(dateRange[0]), toISO(dateRange[1])],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [selectedMonth, columnFilters, dateRange]);
  const table = useReactTable<CombinedRecord>({
    data: combinedData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const currentMonthRows = useMemo(() => {
    return table.getFilteredRowModel().rows.filter((row) => {
      const record = row.original;
      const dueDate = isOrder(record) ? record.due_date : record.due_date;
      if (!dueDate) return false;

      const [year, month] = dueDate.split("-");
      const formattedKey = `${month}/${year}`;

      return formattedKey === selectedMonth;
    });
  }, [selectedMonth, table.getFilteredRowModel().rows]);

  const {
    totalNotasEntrada,
    totalEntradaPagas,
    totalEntradaVencidas,
    totalNotasSaida,
    totalSaidaRecebidas,
    totalSaidaVencidas,
  } = useMemo(() => {
    let totalNotasEntrada = 0;
    let totalEntradaPagas = 0;
    let totalEntradaVencidas = 0;

    let totalNotasSaida = 0;
    let totalSaidaRecebidas = 0;
    let totalSaidaVencidas = 0;

    const today = new Date();

    for (const item of currentMonthRows) {
      const record = item.original;
      const isFinancial = !isOrder(record);
      const value = isOrder(record)
        ? Number(record.total ?? 0)
        : Number(record.amount ?? 0);
      const status = isOrder(record) ? record.payment_status : record.status;
      const type = isOrder(record) ? "output" : record.type;
      const dueDateStr = record.due_date;
      const dueDate = dueDateStr ? new Date(dueDateStr) : null;

      if (type === "input") {
        totalNotasEntrada += value;
        if (status === "Paid") totalEntradaPagas += value;
        if (status === "Unpaid" && dueDate && dueDate < today)
          totalEntradaVencidas += value;
      }

      if (type === "output") {
        totalNotasSaida += value;
        if (status === "Paid") totalSaidaRecebidas += value;
        if (status === "Unpaid" && dueDate && dueDate < today)
          totalSaidaVencidas += value;
      }
    }

    return {
      totalNotasEntrada,
      totalEntradaPagas,
      totalEntradaVencidas,
      totalNotasSaida,
      totalSaidaRecebidas,
      totalSaidaVencidas,
    };
  }, [currentMonthRows]);

  return (
    <>
      <HeaderActions table={table} />
      <Filters
        table={table}
        issueDateInput={issueDateInput}
        setIssueDateInput={setIssueDateInput}
        dueDateInput={dueDateInput}
        setDueDateInput={setDueDateInput}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 px-6 text-sm font-medium text-muted-foreground">
        <div>
          <span>Total Notas de Entrada: </span>
          <span className="text-red-600 font-semibold">
            R$ {totalNotasEntrada.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div>
          <span>Total Entrada Pagas: </span>
          <span className="text-blue-600 font-semibold">
            R$ {totalEntradaPagas.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div>
          <span>Total Entrada Vencidas: </span>
          <span className="text-orange-600 font-semibold">
            R$ {totalEntradaVencidas.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div>
          <span>Total Notas de Saída: </span>
          <span className="text-green-600 font-semibold">
            R$ {totalNotasSaida.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div>
          <span>Total Saída Recebidas: </span>
          <span className="text-blue-600 font-semibold">
            R$ {totalSaidaRecebidas.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div>
          <span>Total Saída Vencidas: </span>
          <span className="text-orange-600 font-semibold">
            R$ {totalSaidaVencidas.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
      <Tabs
        value={selectedMonth}
        onValueChange={setSelectedMonth}
        className="overflow-hidden rounded-lg mx-6"
      >
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="mb-4">
            {monthKeysSorted.map((monthKey) => (
              <TabsTrigger key={monthKey} value={monthKey}>
                {monthKey}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {monthKeysSorted.map((monthKey) => (
          <TabsContent key={monthKey} value={monthKey}>
            <MonthlyFinancialTable table={table} monthKey={monthKey} />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end mr-4">
        <Button
          variant="outline"
          onClick={() => exportTableToCSV(table, "financial_records.csv")}
        >
          Exportar CSV
        </Button>
      </div>

{selectedOrder && isOrder(selectedOrder) && (
  <PaymentModal
    order={{
      ...selectedOrder,
      total_payed: selectedOrder.total_payed ?? 0,
    }}
    open={isPaymentOpen}
    onClose={() => setIsPaymentOpen(false)}
    onSuccess={() => {
      refreshOrders();
      setIsPaymentOpen(false);
    }}
  />
)}

      {selectedFinancial && (
        <YourFinancialRecords
          open={isFinancialPaymentOpen}
          financial={selectedFinancial}
          onClose={() => setIsFinancialPaymentOpen(false)}
          onSuccess={async () => {
            await fetchAll();
            setIsFinancialPaymentOpen(false);
            setSelectedFinancial(null);
            toast.success("Nota marcada como paga!");
          }}
        />
      )}
      <PaymentSheet
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        selectedFinancial={selectedFinancial}
        setSelectedFinancial={setSelectedFinancial}
        isPaymentOpen={isPaymentOpen}
        setIsPaymentOpen={setIsPaymentOpen}
        isFinancialPaymentOpen={isFinancialPaymentOpen}
        setIsFinancialPaymentOpen={setIsFinancialPaymentOpen}
        refreshOrders={refreshOrders}
        fetchAll={fetchAll}
      />
{selectedOrder?.source === "financial" && companyId && (
  <FinancialPaymentModal
    order={selectedOrder as FinancialRecord}
    companyId={companyId}
    open={isPaymentOpen}
    onClose={() => {
      setIsPaymentOpen(false);
      setSelectedOrder(null);
    }}
    onSuccess={(id) => {
      setFinancialRecords((prev) =>
        prev.map((record) =>
          record.id === id ? { ...record, status: "Paid" } : record,
        ),
      );
    }}
  />
)}
    </>
  );
}
