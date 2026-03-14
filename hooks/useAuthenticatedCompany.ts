"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

type UserRole = "admin" | "motorista";

type AuthenticatedCompany = {
  user: any | null;
  companyId: string | null;
  role: UserRole | null;
  loading: boolean;
};

// Evita recriar a instância do Supabase a cada render
const supabase = createClientComponentClient();

export function useAuthenticatedCompany(): AuthenticatedCompany {
  const [user, setUser] = useState<any | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data?.user) {
        console.warn(
          "❌ Sessão ausente ou erro ao buscar usuário:",
          userError?.message,
        );

        setUser(null);
        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const currentUser = data.user;
      setUser(currentUser);

      const { data: companyUser, error: companyError } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", currentUser.id)
        .single();

      if (companyError) {
        console.error("❌ Erro ao buscar empresa:", companyError.message);
        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (!companyUser) {
        console.warn("⚠️ Nenhuma empresa vinculada a esse usuário.");
        toast.error("Usuário sem empresa vinculada.");

        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setCompanyId(companyUser.company_id);
      setRole(companyUser.role as UserRole | null);
    } catch (err) {
      console.error("❌ Erro inesperado no hook useAuthenticatedCompany:", err);
      toast.error("Erro inesperado ao buscar empresa.");

      setUser(null);
      setCompanyId(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetchCompany();
  }, [fetchCompany]);

  return { user, companyId, role, loading };
}