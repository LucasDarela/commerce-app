"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";




export default function Analytics() {
  

  return (
<div className="p-8">

      {/* 🔹 Campo de Pesquisa */}
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Pesquise por CPF ou Telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
                <Button onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
          Analytics
        </Button>
      </div>
    </div>
  );
}