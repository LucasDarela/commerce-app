// HeaderActions.tsx
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconChevronDown,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";

type HeaderActionsProps<T> = {
  table: Table<T>;
};

export function HeaderActions<T>({ table }: HeaderActionsProps<T>) {
  return (
    <div className="w-full flex justify-between items-center px-4 lg:px-6 my-2">
      {/* Título à esquerda */}
      <h2 className="text-xl font-bold">Financeiro</h2>

      {/* Botões à direita */}
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[100px]">
              <IconLayoutColumns />
              <span className="hidden sm:inline">Colunas</span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((column) => {
                const columnTranslations: Record<string, string> = {
                  due_date: "Data de Vencimento",
                  customer_or_supplier: "Cliente / Fornecedor",
                  type: "Tipo",
                  category: "Categoria",
                  payment_method: "Método de Pag.",
                  payment_status: "Status do Pag.",
                  remaining: "Restante",
                  total: "Total",
                  nfe_status: "Status NFe",
                  boleto_status: "Status Boleto",
                  actions: "Ações",
                };

                const title =
                  columnTranslations[column.id] ||
                  column.id.replace(/_/g, " ");

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {title}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/dashboard/financial/add">
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span className="hidden sm:inline">Financeiro</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
