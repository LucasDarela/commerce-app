"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

interface Driver {
  id: string;
  username: string;
}

export default function DriverSelect() {
  const supabase = createBrowserSupabaseClient(); 
  const { companyId, loading: authLoading } = useAuthenticatedCompany();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;

    if (!companyId) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    async function fetchDrivers() {
      setLoading(true);

      const { data: companyUsers, error: companyUsersError } = await supabase
        .from("company_users")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("role", "driver");

      if (companyUsersError) {
        console.error("Erro ao buscar drivers da empresa:", companyUsersError);
        setDrivers([]);
        setLoading(false);
        return;
      }

      const userIds = (companyUsers ?? []).map((item) => item.user_id);

      if (userIds.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      if (profilesError) {
        console.error("Erro ao buscar profiles dos drivers:", profilesError);
        setDrivers([]);
        setLoading(false);
        return;
      }

      setDrivers(profiles ?? []);
      setLoading(false);
    }

    fetchDrivers();
  }, [companyId, authLoading]);

  if (loading) {
    return <p>Carregando motoristas...</p>;
  }

  return (
    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione o motorista" />
      </SelectTrigger>
      <SelectContent>
        {drivers.length > 0 ? (
          drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              {driver.username}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-drivers" disabled>
            Nenhum motorista encontrado
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}