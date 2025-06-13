import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCompanyIntegration } from "@/hooks/use-company-integration";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabase } from "@/lib/supabase";
import { PaymentModal } from "@/components/payment-modal";
import { YourFinancialRecords } from "@/components/your-financial-modal";
import { DataTableConfig } from "./DataTableConfig";
import { FinancialFilters as Filters } from "./Filters";
import { HeaderActions } from "./HeaderActions";
import { PaymentSheet } from "./PaymentSheet";
import { mapToFinancialPaymentMethod, groupByDueMonth } from "./utils";
import { orderSchema, financialSchema } from "./schema";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { financialColumns } from "./columns";
import { FinancialRecord as FinancialRecordType } from "@/components/types/financial";
import { Order as OrderType } from "@/components/types/orders";
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

export type Sale = z.infer<typeof orderSchema>;
export type Order = z.infer<typeof orderSchema>;
export type FinancialRecord = z.infer<typeof financialSchema>;
export type CombinedRecord =
  | (Order & { source: "order" })
  | (FinancialRecord & { source: "financial" });

export default function DataFinancialTable() {
  useEffect(() => {});
  const [orders, setOrders] = useState<Order[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    [],
  );
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<
    Order | FinancialRecord | null
  >(null);
  const [selectedFinancial, setSelectedFinancial] =
    useState<FinancialRecord | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isFinancialPaymentOpen, setIsFinancialPaymentOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(
    getInitialColumnVisibility,
  );
  const supabase = createClientComponentClient();
  const { accessToken } = useCompanyIntegration("mercado_pago");
  const [issueDateInput, setIssueDateInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");

  const router = useRouter();

  const deleteOrderById = useCallback(
    async (id: string) => {
      const confirmDelete = confirm(
        "Tem certeza que deseja excluir esta nota?",
      );
      if (!confirmDelete) return;

      const record = [...orders, ...financialRecords].find((r) => r.id === id);
      if (!record) {
        toast.error("Registro não encontrado.");
        return;
      }

      const source = (record as CombinedRecord).source;
      const tableName = source === "financial" ? "financial_records" : "orders";

      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) {
        console.error("❌ Erro ao deletar:", error);
        toast.error("Erro ao deletar a nota.");
        return;
      }

      toast.success("Nota excluída com sucesso!");

      // Atualiza o estado local
      if (source === "financial") {
        setFinancialRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        setOrders((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [supabase, orders, financialRecords],
  );

  const columns = useMemo(
    () =>
      financialColumns({
        suppliers,
        onDelete: deleteOrderById,
        setSelectedOrder,
        setIsPaymentOpen,
      }),
    [suppliers, deleteOrderById, setSelectedOrder, setIsPaymentOpen],
  );

  const fetchAll = async () => {
    const [ordersRes, financialRes, suppliersRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("order_index", { ascending: true }),
      supabase
        .from("financial_records")
        .select("*")
        .order("issue_date", { ascending: false }),
      supabase.from("suppliers").select("id, name"),
    ]);

    const parsedOrders = orderSchema
      .array()
      .safeParse(ordersRes.data?.map((o) => ({ ...o, source: "order" })));
    if (parsedOrders.success) {
      setOrders(parsedOrders.data.map((o) => ({ ...o, source: "order" })));
    } else {
      console.error("Erro ao validar orders:", parsedOrders.error);
    }

    const parsedFinancials = financialSchema
      .array()
      .safeParse(
        financialRes.data?.map((f) => ({ ...f, source: "financial" })),
      );
    if (parsedFinancials.success) {
      setFinancialRecords(
        parsedFinancials.data.map((f) => ({ ...f, source: "financial" })),
      );
    } else {
      console.error(
        "Erro ao validar financial records:",
        parsedFinancials.error,
      );
    }

    setSuppliers(suppliersRes.data || []);
    setLoading(false);
  };

  const refreshOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("order_index", { ascending: true });
    const parsed = orderSchema.array().safeParse(data);
    if (parsed.success) {
      setOrders(parsed.data.map((o) => ({ ...o, source: "order" })));
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    persistColumnVisibility(columnVisibility);
  }, [columnVisibility]);

  const combinedData: CombinedRecord[] = useMemo(() => {
    return [
      ...orders.map((o) => ({
        ...o,
        source: "order" as const,
        amount: o.total,
        status: o.payment_status === "Paid" ? "Paid" : "Unpaid",
        payment_method: o.payment_method as
          | "Pix"
          | "Dinheiro"
          | "Boleto"
          | "Cartao",
        supplier_id: "",
        supplier: o.customer,
        company_id: "",
        category: "order",
        description: o.customer,
        type: "output",
        notes: "",
        total_payed: Number(o.total_payed ?? 0),
        phone: o.phone,
      })),
      ...financialRecords.map((f) => ({
        ...f,
        source: "financial" as const,
      })),
    ];
  }, [orders, financialRecords]);

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

  // ✅ Inicializar diretamente com o último mês disponível
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    return `${month}/${year}`;
  });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState({});

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
      {selectedOrder?.source === "financial" && (
        <FinancialPaymentModal
          order={selectedOrder as FinancialRecord}
          open={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={fetchAll}
        />
      )}
    </>
  );
}
