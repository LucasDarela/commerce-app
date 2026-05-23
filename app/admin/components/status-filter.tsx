"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const currentStatus = searchParams.get("status") || "all";

  return (
    <div className="relative">
      <select
        value={currentStatus}
        onChange={handleValueChange}
        className={`appearance-none bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors cursor-pointer ${isPending ? 'opacity-50' : ''}`}
      >
        <option value="all">Todos os Status</option>
        <option value="active">Pagantes (Ativos)</option>
        <option value="trialing">Em Teste (Trial)</option>
        <option value="abandoned">Abandono de Checkout</option>
        <option value="canceled">Cancelados</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-400">
        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
}
