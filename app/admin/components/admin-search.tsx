"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export function AdminSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(searchParams.get("q") || "");

  useEffect(() => {
    // Sincroniza o input se a URL mudar por outros meios
    setTerm(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerm(value);
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      // Usamos { scroll: false } para a página não pular pra cima enquanto digita
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="relative w-64">
      <Search className={`absolute left-2 top-2.5 h-4 w-4 ${isPending ? 'text-orange-500 animate-pulse' : 'text-neutral-500'}`} />
      <Input 
        placeholder="Buscar por email ou empresa..." 
        className="pl-8 bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-orange-500 transition-colors" 
        value={term}
        onChange={handleSearch}
      />
    </div>
  );
}
