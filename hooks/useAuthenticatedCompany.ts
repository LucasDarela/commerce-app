"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

// Evita recriar a instância do Supabase a cada render
const supabase = createClientComponentClient();

export function useAuthenticatedCompany() {
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getUser();

      if (!session) {
        console.warn("❌ Sessão ausente.");
        setLoading(false);
        return;
      }

      const user = session.user;
      setUser(user);

      const { data: companyUser, error } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !companyUser) {
        console.error("❌ Erro ao buscar empresa:", error?.message);
        toast.error("Erro ao carregar empresa do usuário.");
        setLoading(false);
        return;
      }

      setCompanyId(companyUser.company_id);
    } catch (error) {
      console.error("❌ Erro inesperado no hook useAuthenticatedCompany:", error);
      toast.error("Erro inesperado ao buscar empresa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ✅ Apenas executa uma vez quando o componente monta
    fetchCompany();
  }, [fetchCompany]);

  return { user, companyId, loading };
}