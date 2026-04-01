import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO, isWithinInterval } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FinancialRecord } from "@/components/financial/schema";
import { Order as OrderBasic } from "@/components/types/order";
import { isOrder, isFinancial } from "./utils";
import { ActionsCell } from "../actions-cell";
import { Order } from "@/components/types/orders";
import type { CombinedRecord, InvoiceStatus } from "./types";

type RecordWithFlags = {
  source?: "order" | "financial";
  has_nfe?: boolean;
  has_boleto?: boolean;
};

function StatusDot({ active }: { active?: boolean }) {
  return (
    <div className="flex justify-center items-center">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          active ? "bg-green-500" : "bg-muted-foreground/30"
        }`}
      />
    </div>
  );
}

export type CustomColumnMeta = {
  className?: string;
};

export type CustomColumnDef<T> = ColumnDef<T, unknown> & {
  meta?: CustomColumnMeta;
};

  function DotBase({
  dotClass,
  label,
}: {
  dotClass: string;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NfeDot({ status }: { status: InvoiceStatus | null }) {
  let dotClass = "bg-red-500";
  let label = "Erro";

  if (status === "autorizado") {
    dotClass = "bg-emerald-500";
    label = "Autorizado";
  } else if (status === "processando_autorizacao") {
    dotClass = "bg-amber-500";
    label = "Em análise";
  } else if (status === "cancelado" || status === "inutilizado") {
    dotClass = "bg-red-500";
    label = status === "cancelado" ? "Cancelado" : "Inutilizado";
  } else if (status == null) {
    dotClass = "bg-muted-foreground/30";
    label = "Sem NF-e";
  }

  return <DotBase dotClass={dotClass} label={label} />;
}

function BoletoDot({ active }: { active: boolean }) {
  const dotClass = active ? "bg-emerald-500" : "bg-muted-foreground/30";
  const label = active ? "Boleto gerado" : "Sem boleto";

  return <DotBase dotClass={dotClass} label={label} />;
}

export function financialColumns({
  suppliers,
  onDelete,
  setSelectedOrder,
  setIsPaymentOpen,
  nfeStatusByOrderId,
  boletoStatusByOrderId,
}: {
  suppliers: { id: string; name: string }[];
  onDelete: (id: string) => void;
  setSelectedOrder: React.Dispatch<
    React.SetStateAction<CombinedRecord | null>
  >;
  setIsPaymentOpen: (open: boolean) => void;
  nfeStatusByOrderId: Record<string, InvoiceStatus | null>;
  boletoStatusByOrderId: Record<string, boolean>;
}): CustomColumnDef<CombinedRecord>[] {
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
        let value = row.getValue(columnId);

        if (!value) return false;

        // 🔹 Normalizar sempre para string YYYY-MM-DD
        let dateStr: string;

        if (value instanceof Date) {
          dateStr = value.toISOString().split("T")[0]; // date puro
        } else if (typeof value === "string") {
          dateStr = value.includes("T") ? value.split("T")[0] : value; // text ou timestamp
        } else {
          return false;
        }

        // 🔹 Filtro de data única
        if (typeof filterValue === "string") {
          return dateStr === filterValue;
        }

        // 🔹 Filtro por intervalo
        if (filterValue?.from || filterValue?.to) {
          const fromDate = filterValue.from ? new Date(filterValue.from) : null;
          const toDate = filterValue.to ? new Date(filterValue.to) : null;
          const currentDate = new Date(dateStr);

          if (fromDate && toDate) {
            return currentDate >= fromDate && currentDate <= toDate;
          }
          if (fromDate) {
            return currentDate >= fromDate;
          }
          if (toDate) {
            return currentDate <= toDate;
          }
        }

        return true;
      },
      cell: ({ row }) => {
        const rawDate = row.original.due_date;
        if (!rawDate) return "—";
        const [year, month, day] = rawDate.split("-");
        return `${day}/${month}/${year}`;
      },
    },
    {
      id: "customer_or_supplier",
      header: "Fornecedor / Cliente",
      size: 200,
      accessorFn: (row) => {
        if (isOrder(row)) return row.customer;
        if (isFinancial(row))
          return (
            suppliers.find((s) => s.id === row.supplier_id)?.name ||
            row.supplier
          );
        return "—";
      },
      filterFn: "includesString",
      meta: { className: "w-[200px] truncate uppercase" },
      cell: ({ row }) => {
        const record = row.original;
        if (isOrder(record)) return record.customer || "—";
        if (isFinancial(record)) {
          const name = suppliers.find((s) => s.id === record.supplier_id)?.name;
          return name || record.supplier || "—";
        }
        return "—";
      },
    },
    {
      id: "source",
      header: "Origem",
      meta: { className: "truncate" },
      enableHiding: false,
      accessorFn: (row) => {
        if ("source" in row) return row.source;
        return "unknown";
      },
      cell: ({ row }) => (isOrder(row.original) ? "Pedido" : "Nota Financeira"),
    },
    {
      id: "type",
      header: "Tipo",
      accessorFn: (row) => (isFinancial(row) ? row.type : "output"),
      cell: ({ row }) => {
        if (isFinancial(row.original)) {
          return row.original.type === "input" ? "Entrada" : "Saída";
        }
        return "Saída";
      },
    },
    {
      id: "category",
      header: "Categoria",
      accessorFn: (row) => (isFinancial(row) ? row.category : "order"),
      cell: ({ row }) =>
        isFinancial(row.original) ? row.original.category : "Pedido",
    },
    {
      id: "payment_method",
      header: "Método",
      meta: { className: "uppercase truncate" },

      // 🔹 filtro sempre trabalha com valores canônicos
      accessorFn: (row) => {
        const raw = row.payment_method;

        const normalize: Record<
          string,
          "Pix" | "Dinheiro" | "Boleto" | "Cartao"
        > = {
          Pix: "Pix",
          Cash: "Dinheiro",
          Dinheiro: "Dinheiro",
          Ticket: "Boleto",
          Boleto: "Boleto",
          Card: "Cartao",
          Cartao: "Cartao",
          Cartão: "Cartao",
        };

        return normalize[String(raw)] ?? String(raw);
      },

cell: ({ row }) => {
  const value = row.getValue("payment_method") as string;

  const labelMap: Record<string, string> = {
    Pix: "Pix",
    Dinheiro: "Dinheiro",
    Boleto: "Boleto",
    Cartao: "Cartão",
  };

  return labelMap[value] ?? value;
},
    },
    {
      id: "payment_status",
      header: "Pagamento",
      accessorFn: (row) => {
        if (isFinancial(row)) {
          const total = Number(row.amount ?? 0);
          const paid = Number(row.total_payed ?? 0);

          if (paid > 0 && paid < total) return "Partial";
          return row.status === "Paid" ? "Paid" : "Unpaid";
        }

        return row.payment_status === "Paid" ? "Paid" : "Unpaid";
},
      filterFn: (row, columnId, filterValue) => {
        const value = row.getValue(columnId);
        return value === filterValue;
      },
      cell: ({ row }) => {
const record = row.original;

if (isFinancial(record)) {
  const total = Number(record.amount ?? 0);
  const paid = Number(record.total_payed ?? 0);

  if (paid > 0 && paid < total) {
    return "Parcial";
  }

  return record.status === "Paid" ? "Pago" : "Pendente";
}

const status = record.payment_status;

return status === "Paid" ? "Pago" : "Pendente";
      },
    },
    {
      id: "remaining",
      header: "Restante",
      meta: { className: "text-right uppercase truncate" },
      accessorFn: (row) => {
        const total = isOrder(row) ? row.total : row.amount;
        const total_payed = isOrder(row)
          ? (row.total_payed ?? 0)
          : ((row as FinancialRecord).total_payed ?? 0);

        return Number(total) - Number(total_payed);
      },
      cell: ({ row }) => {
        const total =
          Number(
            isOrder(row.original) ? row.original.total : row.original.amount,
          ) || 0;
        const total_payed = isOrder(row.original)
          ? Number(row.original.total_payed ?? 0)
          : Number((row.original as FinancialRecord).total_payed ?? 0);

        const remaining = total - total_payed;
        return `R$ ${remaining.toFixed(2).replace(".", ",")}`;
      },
    },
    {
      id: "total",
      header: "Total",
      meta: { className: "text-right uppercase" },
      accessorFn: (row) => (isOrder(row) ? row.total : row.amount),
      cell: ({ row }) => {
        const raw = isOrder(row.original)
          ? row.original.total
          : row.original.amount;
        const value = Number(raw) || 0;
        return `R$ ${value.toFixed(2).replace(".", ",")}`;
      },
    },
    {
      id: "nfe_status",
      header: "",
      size: 35,
      meta: { className: "w-[35px]" },
      cell: ({ row }) => {
        const record = row.original;

        if (!isOrder(record)) {
          return <NfeDot status={null} />;
        }

        const status = nfeStatusByOrderId[String(record.id)] ?? null;
        return <NfeDot status={status} />;
      },
      enableSorting: false,
    },
    {
      id: "boleto_status",
      header: "",
      size: 35,
      meta: { className: "w-[35px]" },
      cell: ({ row }) => {
        const record = row.original;

        if (!isOrder(record)) {
          return <BoletoDot active={false} />;
        }

        const hasBoleto = boletoStatusByOrderId[String(record.id)] ?? false;
        return <BoletoDot active={hasBoleto} />;
      },
      enableSorting: false,
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
        );
      },
    },
  ];
}
