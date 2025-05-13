"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@tanstack/react-table"

type Props<T> = {
  table: Table<T>
  issueDateInput: string
  setIssueDateInput: React.Dispatch<React.SetStateAction<string>>
  dueDateInput: string
  setDueDateInput: React.Dispatch<React.SetStateAction<string>>
}

export function FinancialFilters<T>({
  table,
  issueDateInput,
  setIssueDateInput,
  dueDateInput,
  setDueDateInput,
}: Props<T>) {
  function formatDateInput(
    e: React.ChangeEvent<HTMLInputElement>,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    columnKey: string
  ) {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 8) value = value.slice(0, 8)

    const parts = []
    if (value.length > 0) parts.push(value.slice(0, 2))
    if (value.length > 2) parts.push(value.slice(2, 4))
    if (value.length > 4) parts.push(value.slice(4, 8))

    const formatted = parts.join("/")
    setInput(formatted)

    if (formatted.length === 10) {
      const [day, month, year] = formatted.split("/")
      const isoDate = `${year}-${month}-${day}`
      table.getColumn(columnKey)?.setFilterValue(isoDate)
    } else {
      table.getColumn(columnKey)?.setFilterValue(undefined)
    }
  }

  return (
    <div className="grid gap-2 px-4 py-1 lg:px-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 items-center">
      <Input
        type="text"
        inputMode="numeric"
        placeholder="Emissão"
        value={issueDateInput}
        onChange={(e) => formatDateInput(e, setIssueDateInput, "issue_date")}
        maxLength={10}
        className="min-w-[70px] w-full"
      />

      <Input
        type="text"
        inputMode="numeric"
        placeholder="Vencimento"
        value={dueDateInput}
        onChange={(e) => formatDateInput(e, setDueDateInput, "due_date")}
        maxLength={10}
        className="min-w-[70px] w-full"
      />

      <Input
        placeholder="Buscar por Nome"
        value={(table.getColumn("customer_or_supplier")?.getFilterValue() as string) ?? ""}
        onChange={(e) => table.getColumn("customer_or_supplier")?.setFilterValue(e.target.value)}
        className="min-w-[100px] w-full"
      />
      <Select
  value={(table.getColumn("source")?.getFilterValue() as string) ?? ""}
  onValueChange={(value) =>
    table.getColumn("source")?.setFilterValue(value === "all" ? undefined : value)
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

      <Select
  value={(table.getColumn("category")?.getFilterValue() as string) ?? ""}
  onValueChange={(value) =>
    table.getColumn("category")?.setFilterValue(value === "all" ? undefined : value)
  }
>
  <SelectTrigger className="min-w-[120px] w-full">
    <SelectValue placeholder="Categoria da Nota" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas</SelectItem>
    <SelectItem value="order">Pedido</SelectItem>
    <SelectItem value="compra_produto">Compra Produto</SelectItem>
    <SelectItem value="compra_equipamento">Compra Equipamento</SelectItem>
    <SelectItem value="vale_funcionario">Vale Funcionário</SelectItem>
    <SelectItem value="outros">Outros</SelectItem>
  </SelectContent>
</Select>

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
          <SelectItem value="Pendente">Pendente</SelectItem>
          <SelectItem value="Pago">Pago</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}