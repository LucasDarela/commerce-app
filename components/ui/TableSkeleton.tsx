"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-4 px-4 lg:px-6 mt-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-[150px]" /> {/* Título */}
        <Skeleton className="h-8 w-[120px]" /> {/* Botão Novo Pedido */}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>

      {/* Tabela Skeleton */}
      <div className="border rounded-lg overflow-hidden mt-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b last:border-none"
          >
            <Skeleton className="h-4 w-[80px]" /> {/* Data */}
            <Skeleton className="h-4 w-[50px]" /> {/* Hora */}
            <Skeleton className="h-4 flex-1" /> {/* Cliente */}
            <Skeleton className="h-4 w-[80px]" /> {/* Total */}
          </div>
        ))}
      </div>
    </div>
  );
}
