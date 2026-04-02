"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Table } from "@tanstack/react-table";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CustomDateInput from "@/components/ui/CustomDateInput";
import { IconTrash } from "@tabler/icons-react";

const FIXED_CATEGORY_LABELS: Record<string, string> = {
  compra_produto: "Compra de Produto",
  compra_equipamento: "Compra de Equipamento",
  pgto_funcionario: "Pagamento Funcionário",
  vale_funcionario: "Vale Funcionário",
  combustivel: "Combustível",
  veiculo: "Gastos com Veículos",
  aluguel: "Aluguel",
  contabilidade: "Contabilidade",
  utilidades: "Utilidades",
  others: "+ Outros",
  order: "Pedido",
};

type Props<T> = {
  table: Table<T>;
  issueDateInput: string;
  setIssueDateInput: React.Dispatch<React.SetStateAction<string>>;
  dueDateInput: string;
  setDueDateInput: React.Dispatch<React.SetStateAction<string>>;
  dateRange: [Date | null, Date | null];
  setDateRange: React.Dispatch<
    React.SetStateAction<[Date | null, Date | null]>
  >;
};

export function FinancialFilters<T>({
  table,
  issueDateInput,
  setIssueDateInput,
  dueDateInput,
  setDueDateInput,
  dateRange,
  setDateRange,
}: Props<T>) {
  const [startDate, endDate] = dateRange;

  const clearAllFilters = () => {
    setDateRange([null, null]);
    setIssueDateInput("");
    setDueDateInput("");
    table.resetColumnFilters();
  };

  const sourceValue =
    (table.getColumn("source")?.getFilterValue() as string) ?? "__all__";

  const typeValue =
    (table.getColumn("type")?.getFilterValue() as string) ?? "__all__";

  const categoryValue =
    (table.getColumn("category")?.getFilterValue() as string) ?? "__all__";

  const paymentMethodValue =
    (table.getColumn("payment_method")?.getFilterValue() as string) ??
    "__all__";

  const paymentStatusValue =
    (table.getColumn("payment_status")?.getFilterValue() as string) ??
    "__all__";

  const preFilteredRows = table.getPreFilteredRowModel().rows;

  const { fixedCategoryOptions, customCategoryOptions } = React.useMemo(() => {
    const values = new Set<string>();

    preFilteredRows.forEach((row) => {
      const original = row.original as any;

      if (original?.source === "financial" && original?.category) {
        values.add(String(original.category).trim());
      }

      if (original?.source === "order") {
        values.add("order");
      }
    });

    const all = Array.from(values);

    const fixed = all
      .filter((category) => category in FIXED_CATEGORY_LABELS)
      .sort((a, b) =>
        (FIXED_CATEGORY_LABELS[a] ?? a).localeCompare(
          FIXED_CATEGORY_LABELS[b] ?? b,
          "pt-BR",
        ),
      );

    const custom = all
      .filter((category) => !(category in FIXED_CATEGORY_LABELS))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      fixedCategoryOptions: fixed,
      customCategoryOptions: custom,
    };
  }, [preFilteredRows]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 px-4 lg:px-6 py-2 items-center">
      <div className="relative w-full min-w-0 z-50">
        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) =>
            setDateRange(update as [Date | null, Date | null])
          }
          isClearable={false}
          placeholderText="Filtrar por Período"
          dateFormat="dd/MM/yyyy"
          customInput={<CustomDateInput />}
          wrapperClassName="w-full"
          popperPlacement="bottom-start"
          popperClassName="z-[9999]"
        />

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => setDateRange([null, null])}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-600"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </div>

      <Input
        placeholder="Buscar por Nome"
        value={
          (table.getColumn("customer_or_supplier")?.getFilterValue() as string) ??
          ""
        }
        onChange={(e) =>
          table
            .getColumn("customer_or_supplier")
            ?.setFilterValue(e.target.value)
        }
        className="w-full"
      />

      <Select
        value={sourceValue}
        onValueChange={(value) =>
          table
            .getColumn("source")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger
          className={`w-full ${sourceValue === "__all__" ? "text-muted-foreground" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Origem da Nota</SelectItem>
          <SelectItem value="order">Pedido</SelectItem>
          <SelectItem value="financial">Nota Financeira</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={typeValue}
        onValueChange={(value) =>
          table
            .getColumn("type")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger
          className={`w-full ${typeValue === "__all__" ? "text-muted-foreground" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tipo de nota</SelectItem>
          <SelectItem value="input">Entrada</SelectItem>
          <SelectItem value="output">Saída</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={categoryValue}
        onValueChange={(value) =>
          table
            .getColumn("category")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger
          className={`w-full ${categoryValue === "__all__" ? "text-muted-foreground" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as Categorias</SelectItem>

          {fixedCategoryOptions.length > 0 && (
            <SelectItem value="__fixed_header" disabled>
              ─ Categorias fixas ─
            </SelectItem>
          )}

          {fixedCategoryOptions.map((category) => (
            <SelectItem key={category} value={category}>
              {FIXED_CATEGORY_LABELS[category] ?? category}
            </SelectItem>
          ))}

          {customCategoryOptions.length > 0 && (
            <>
              <SelectItem value="__custom_header" disabled>
                ─ Personalizadas ─
              </SelectItem>

              {customCategoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      <Select
        value={paymentMethodValue}
        onValueChange={(value) =>
          table
            .getColumn("payment_method")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger
          className={`w-full ${paymentMethodValue === "__all__" ? "text-muted-foreground" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Método de Pagamento</SelectItem>
          <SelectItem value="Pix">Pix</SelectItem>
          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
          <SelectItem value="Boleto">Boleto</SelectItem>
          <SelectItem value="Cartao">Cartão</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={paymentStatusValue}
        onValueChange={(value) =>
          table
            .getColumn("payment_status")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger
          className={`w-full ${paymentStatusValue === "__all__" ? "text-muted-foreground" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Status de Pagamento</SelectItem>
          <SelectItem value="Unpaid">Pendente</SelectItem>
          <SelectItem value="Paid">Pago</SelectItem>
          <SelectItem value="Partial">Parcial</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        className="w-full"
        onClick={clearAllFilters}
      >
        <IconTrash className="mr-2 h-4 w-4" />
        Limpar filtros
      </Button>
    </div>
  );
}