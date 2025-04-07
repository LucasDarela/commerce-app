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
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data?.user) {
        console.warn("❌ Sessão ausente ou erro ao buscar usuário:", userError?.message);
        setLoading(false);
        return;
      }

      const currentUser = data.user;
      setUser(currentUser);

      const { data: companyUser, error: companyError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (companyError || !companyUser) {
        console.error("❌ Erro ao buscar empresa:", companyError?.message);
        toast.error("Erro ao carregar empresa do usuário.");
        setLoading(false);
        return;
      }

      setCompanyId(companyUser.company_id);
    } catch (err) {
      console.error("❌ Erro inesperado no hook useAuthenticatedCompany:", err);
      toast.error("Erro inesperado ao buscar empresa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    fetchCompany();
  }, [fetchCompany]);

  return { user, companyId, loading };
}