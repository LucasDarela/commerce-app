import { Table } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"

const translateMap: Record<string, string> = {
  Paid: "Pago",
  Unpaid: "Pendente",
  financial: "Nota Financeira",
  Pix: "Pix",
  Boleto: "Boleto",
  Cartao: "Cartão",
  Dinheiro: "Dinheiro",
}

// Remove snake_case → Capitalizado
function formatCategory(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatCell(value: any, columnId: string): string {
  if (value === null || value === undefined) return ""

  if (["issue_date", "due_date"].includes(columnId)) {
    try {
      return format(parseISO(value), "dd/MM/yyyy")
    } catch {
      return value
    }
  }

  if (columnId === "amount" || columnId === "total" || columnId === "remaining") {
    return `R$ ${Number(value).toFixed(2).replace(".", ",")}`
  }

  if (columnId === "category") {
    return formatCategory(value)
  }

  if (typeof value === "string" && translateMap[value]) {
    return translateMap[value]
  }

  return `${value}`
}

export function exportTableToCSV<T>(table: Table<T>, filename = "financial_export.csv") {
  const visibleColumns = table.getVisibleFlatColumns().filter((col) => col.id !== "drag" && col.id !== "select")

  const headers = visibleColumns.map((column) => column.columnDef.header as string)

  const rows = table.getFilteredRowModel().rows.map((row) => {
    return visibleColumns
      .map((column) => {
        const raw = row.getValue(column.id)
        const formatted = formatCell(raw, column.id)
        return `"${formatted.replace(/"/g, '""')}"`
      })
      .join(";")
  })

  const totalSum = table
    .getFilteredRowModel()
    .rows.reduce((sum, row) => {
      const value = row.getValue("total")
      return sum + (typeof value === "number" ? value : Number(value) || 0)
    }, 0)

  const totalFooter = `\n;;;;;TOTAL GERAL:;R$ ${totalSum.toFixed(2).replace(".", ",")}`

  const csvContent = [headers.join(";"), ...rows, totalFooter].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}