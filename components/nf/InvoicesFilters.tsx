// components/nf/InvoicesFilters.tsx
"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface InvoicesFiltersProps {
  filters: {
    customerName: string;
    numero: string;
    status: string;
    natureza: string;
    valorTotal: string;
  };
  setFilters: (filters: InvoicesFiltersProps["filters"]) => void;
}

export function InvoicesFilters({ filters, setFilters }: InvoicesFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
      <Input
        placeholder="Cliente"
        value={filters.customerName}
        onChange={(e) =>
          setFilters({ ...filters, customerName: e.target.value })
        }
      />
      <Input
        placeholder="Número"
        value={filters.numero}
        onChange={(e) => setFilters({ ...filters, numero: e.target.value })}
      />
      <Input
        placeholder="Natureza da operação"
        value={filters.natureza}
        onChange={(e) => setFilters({ ...filters, natureza: e.target.value })}
      />
      <Input
        placeholder="Valor Total"
        value={filters.valorTotal}
        onChange={(e) => setFilters({ ...filters, valorTotal: e.target.value })}
      />
      <Select
        value={filters.status}
        onValueChange={(value) => setFilters({ ...filters, status: value })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="autorizado">Autorizada</SelectItem>
          <SelectItem value="processando_autorizacao">Processando</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
          <SelectItem value="inutilizacao">Inutilizado</SelectItem>
          <SelectItem value="erro">Erro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
