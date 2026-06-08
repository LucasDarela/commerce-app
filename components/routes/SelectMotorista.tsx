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

interface DriverSelectProps {
  value: string;
  onChange: (val: string) => void;
}

export default function DriverSelect({ value, onChange }: DriverSelectProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);

      try {
        const response = await fetch('/api/users/team');
        if (!response.ok) {
          throw new Error('Failed to fetch team');
        }
        
        const data = await response.json();
        
        if (data && data.members) {
          // You can filter by role === "driver" here if needed. 
          // For now, listing all members to ensure it works.
          const formattedDrivers = data.members.map((m: any) => ({
            id: m.id,
            username: m.username || m.email || "Usuário Desconhecido"
          }));
          
          setDrivers(formattedDrivers);
        } else {
          setDrivers([]);
        }
      } catch (error) {
        console.error("Erro ao buscar equipe:", error);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDrivers();
  }, []);

  if (loading) {
    return <p>Carregando motoristas...</p>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
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