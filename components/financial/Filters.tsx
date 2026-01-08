// // "use client";

// // import * as React from "react";
// // import { Input } from "@/components/ui/input";
// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";
// // import { Table } from "@tanstack/react-table";

// // import DatePicker from "react-datepicker";
// // import "react-datepicker/dist/react-datepicker.css";
// // import CustomDateInput from "@/components/ui/CustomDateInput";
// // import { IconTrash } from "@tabler/icons-react";
// // import { useEffect, useState } from "react";

// // type Props<T> = {
// //   table: Table<T>;
// //   issueDateInput: string;
// //   setIssueDateInput: React.Dispatch<React.SetStateAction<string>>;
// //   dueDateInput: string;
// //   setDueDateInput: React.Dispatch<React.SetStateAction<string>>;
// // };

// // export function FinancialFilters<T>({
// //   table,
// //   issueDateInput,
// //   setIssueDateInput,
// //   dueDateInput,
// //   setDueDateInput,
// // }: Props<T>) {
// //   function formatDateInput(
// //     e: React.ChangeEvent<HTMLInputElement>,
// //     setInput: React.Dispatch<React.SetStateAction<string>>,
// //     columnKey: string,
// //   ) {
// //     let value = e.target.value.replace(/\D/g, "");
// //     if (value.length > 8) value = value.slice(0, 8);

// //     const parts = [];
// //     if (value.length > 0) parts.push(value.slice(0, 2));
// //     if (value.length > 2) parts.push(value.slice(2, 4));
// //     if (value.length > 4) parts.push(value.slice(4, 8));

// //     const formatted = parts.join("/");
// //     setInput(formatted);

// //     if (formatted.length === 10) {
// //       const [day, month, year] = formatted.split("/");
// //       const isoDate = `${year}-${month}-${day}`;
// //       table.getColumn(columnKey)?.setFilterValue(isoDate);
// //     } else {
// //       table.getColumn(columnKey)?.setFilterValue(undefined);
// //     }
// //   }

// //   // DateRangeFilter
// //   const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
// //     null,
// //     null,
// //   ]);
// //   const [startDate, endDate] = dateRange;

// //   const handleFilter = (range: [Date | null, Date | null]) => {
// //     setDateRange(range);

// //     const isoStart = range[0]?.toISOString().split("T")[0];
// //     const isoEnd = range[1]?.toISOString().split("T")[0];

// //     table.getColumn("due_date")?.setFilterValue({
// //       from: isoStart,
// //       to: isoEnd,
// //     });
// //   };

// //   const clearFilter = () => {
// //     setDateRange([null, null]);
// //     table.getColumn("due_date")?.setFilterValue(undefined);
// //   };

// //   return (
// //     <div className="grid gap-2 px-4 lg:px-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 items-center">
// //       <div className="relative w-full sm:w-full md:max-w-[300px] z-50">
// //         <DatePicker
// //           selectsRange
// //           startDate={startDate}
// //           endDate={endDate}
// //           onChange={(update) =>
// //             handleFilter(update as [Date | null, Date | null])
// //           }
// //           isClearable={false}
// //           placeholderText="Filtrar por Período de Entrega"
// //           dateFormat="dd/MM/yyyy"
// //           customInput={<CustomDateInput />}
// //           popperPlacement="bottom-start"
// //           popperClassName="z-[9999]"
// //         />

// //         {(startDate || endDate) && (
// //           <button
// //             type="button"
// //             onClick={clearFilter}
// //             className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-600"
// //           >
// //             <IconTrash className="w-4 h-4" />
// //           </button>
// //         )}
// //       </div>

// //       <Input
// //         placeholder="Buscar por Nome"
// //         value={
// //           (table
// //             .getColumn("customer_or_supplier")
// //             ?.getFilterValue() as string) ?? ""
// //         }
// //         onChange={(e) =>
// //           table
// //             .getColumn("customer_or_supplier")
// //             ?.setFilterValue(e.target.value)
// //         }
// //         className="min-w-[100px] w-full"
// //       />
// //       <Select
// //         value={(table.getColumn("source")?.getFilterValue() as string) ?? ""}
// //         onValueChange={(value) =>
// //           table
// //             .getColumn("source")
// //             ?.setFilterValue(value === "all" ? undefined : value)
// //         }
// //       >
// //         <SelectTrigger className="min-w-[110px] w-full">
// //           <SelectValue placeholder="Origem" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="all">Todas</SelectItem>
// //           <SelectItem value="order">Pedido</SelectItem>
// //           <SelectItem value="financial">Nota Financeira</SelectItem>
// //         </SelectContent>
// //       </Select>

// //       <Select
// //         value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
// //         onValueChange={(value) =>
// //           table
// //             .getColumn("type")
// //             ?.setFilterValue(value === "all" ? undefined : value)
// //         }
// //       >
// //         <SelectTrigger className="min-w-[100px] w-full">
// //           <SelectValue placeholder="Tipo de nota" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="all">Todas</SelectItem>
// //           <SelectItem value="input">Entrada</SelectItem>
// //           <SelectItem value="output">Saída</SelectItem>
// //         </SelectContent>
// //       </Select>

// //       <Select
// //         value={(table.getColumn("category")?.getFilterValue() as string) ?? ""}
// //         onValueChange={(value) =>
// //           table
// //             .getColumn("category")
// //             ?.setFilterValue(value === "all" ? undefined : value)
// //         }
// //       >
// //         <SelectTrigger className="min-w-[120px] w-full">
// //           <SelectValue placeholder="Categoria da Nota" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="all">Todas</SelectItem>
// //           <SelectItem value="compra_produto">Compra de Produto</SelectItem>
// //           <SelectItem value="compra_equipamento">
// //             Compra de Equipamento
// //           </SelectItem>
// //           <SelectItem value="pgto_funcionario">
// //             Pagamento Funcionário
// //           </SelectItem>
// //           <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
// //           <SelectItem value="combustivel">Combustível</SelectItem>
// //           <SelectItem value="veiculo">Gastos com Veículos</SelectItem>
// //           <SelectItem value="aluguel">Aluguel</SelectItem>
// //           <SelectItem value="contabilidade">Contabilidade</SelectItem>
// //           <SelectItem value="utilidades">Utilidades</SelectItem>
// //           <SelectItem value="others">+ Outros</SelectItem>
// //         </SelectContent>
// //       </Select>

// //       <Select
// //         value={
// //           (table.getColumn("payment_method")?.getFilterValue() as string) ?? ""
// //         }
// //         onValueChange={(value) =>
// //           table
// //             .getColumn("payment_method")
// //             ?.setFilterValue(value === "all" ? undefined : value)
// //         }
// //       >
// //         <SelectTrigger className="min-w-[90px] w-full">
// //           <SelectValue placeholder="Método Pagamento" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="all">Todos</SelectItem>
// //           <SelectItem value="Pix">Pix</SelectItem>
// //           <SelectItem value="Dinheiro">Dinheiro</SelectItem>
// //           <SelectItem value="Boleto">Boleto</SelectItem>
// //           <SelectItem value="Cartao">Cartão</SelectItem>
// //         </SelectContent>
// //       </Select>

// //       <Select
// //         value={
// //           (table.getColumn("payment_status")?.getFilterValue() as string) ?? ""
// //         }
// //         onValueChange={(value) =>
// //           table
// //             .getColumn("payment_status")
// //             ?.setFilterValue(value === "all" ? undefined : value)
// //         }
// //       >
// //         <SelectTrigger className="min-w-[90px] w-full">
// //           <SelectValue placeholder="Status Pagamento" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="all">Todos</SelectItem>
// //           <SelectItem value="Unpaid">Pendente</SelectItem>
// //           <SelectItem value="Paid">Pago</SelectItem>
// //           <SelectItem value="Partial">Parcial</SelectItem>
// //         </SelectContent>
// //       </Select>
// //     </div>
// //   );
// // }"use client";

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
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

type Props<T> = {
  table: Table<T>;

  issueDateInput: string;
  setIssueDateInput: React.Dispatch<React.SetStateAction<string>>;
  dueDateInput: string;
  setDueDateInput: React.Dispatch<React.SetStateAction<string>>;

  // ✅ Range controlado no pai
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

  const clearFilter = () => {
    setDateRange([null, null]); // ✅ só isso. Quem aplica no table é o pai.
  };

  return (
    <div className="grid gap-2 px-4 lg:px-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 items-center">
      {/* Range due_date */}
      <div className="relative w-full sm:w-full md:max-w-[300px] z-50">
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
          popperPlacement="bottom-start"
          popperClassName="z-[9999]"
        />

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={clearFilter}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-600"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </div>

      <Input
        placeholder="Buscar por Nome"
        value={
          (table
            .getColumn("customer_or_supplier")
            ?.getFilterValue() as string) ?? ""
        }
        onChange={(e) =>
          table
            .getColumn("customer_or_supplier")
            ?.setFilterValue(e.target.value)
        }
        className="min-w-[100px] w-full"
      />

      <Select
        value={(table.getColumn("source")?.getFilterValue() as string) ?? "all"}
        onValueChange={(value) =>
          table
            .getColumn("source")
            ?.setFilterValue(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="min-w-[110px] w-full">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="order">Pedido</SelectItem>
          <SelectItem value="financial">Nota Financeira</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={(table.getColumn("type")?.getFilterValue() as string) ?? "all"}
        onValueChange={(value) =>
          table
            .getColumn("type")
            ?.setFilterValue(value === "all" ? undefined : value)
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

      <Select
        value={
          (table.getColumn("category")?.getFilterValue() as string) ?? "all"
        }
        onValueChange={(value) =>
          table
            .getColumn("category")
            ?.setFilterValue(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="min-w-[120px] w-full">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="compra_produto">Compra de Produto</SelectItem>
          <SelectItem value="compra_equipamento">
            Compra de Equipamento
          </SelectItem>
          <SelectItem value="pgto_funcionario">
            Pagamento Funcionário
          </SelectItem>
          <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
          <SelectItem value="combustivel">Combustível</SelectItem>
          <SelectItem value="veiculo">Gastos com Veículos</SelectItem>
          <SelectItem value="aluguel">Aluguel</SelectItem>
          <SelectItem value="contabilidade">Contabilidade</SelectItem>
          <SelectItem value="utilidades">Utilidades</SelectItem>
          <SelectItem value="others">+ Outros</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          (table.getColumn("payment_method")?.getFilterValue() as string) ??
          "all"
        }
        onValueChange={(value) =>
          table
            .getColumn("payment_method")
            ?.setFilterValue(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="min-w-[90px] w-full">
          <SelectValue placeholder="Método" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="Pix">Pix</SelectItem>
          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
          <SelectItem value="Boleto">Boleto</SelectItem>
          <SelectItem value="Cartao">Cartão</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          (table.getColumn("payment_status")?.getFilterValue() as string) ??
          "all"
        }
        onValueChange={(value) =>
          table
            .getColumn("payment_status")
            ?.setFilterValue(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="min-w-[90px] w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="Unpaid">Pendente</SelectItem>
          <SelectItem value="Paid">Pago</SelectItem>
          <SelectItem value="Partial">Parcial</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
