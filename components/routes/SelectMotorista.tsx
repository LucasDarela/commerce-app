"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface Driver {
  id: string;
  username: string;
}

export default function DriverSelect() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchCompanyId() {
      setLoading(true);

      // 1️⃣ pegar usuário logado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Erro ao pegar usuário:", userError);
        setLoading(false);
        return;
      }

      // 2️⃣ buscar o profile para pegar company_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error("Erro ao pegar company_id:", profileError);
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);
    }

    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (!companyId) return;

    async function fetchDrivers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao buscar motoristas:", error);
        return;
      }

      if (!data || data.length === 0) {
        console.log("Nenhum motorista encontrado");
        setDrivers([]);
        return;
      }

      setDrivers(data);
    }

    fetchDrivers().finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <p>Carregando motoristas...</p>;
  }

  return (
    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione o motorista" />
      </SelectTrigger>
      <SelectContent>
        {drivers.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.username}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
