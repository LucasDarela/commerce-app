"use client";

import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

type UserRole = "admin" | "normal" | "driver";

type AuthenticatedCompany = {
  user: any | null;
  companyId: string | null;
  role: UserRole | null;
  loading: boolean;
};

export function useAuthenticatedCompany(): AuthenticatedCompany {
  const [user, setUser] = useState<any | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    const supabase = createClientComponentClient();

    try {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data?.user) {
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

      if (companyError || !companyUser) {
        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const normalizedRole =
        companyUser.role === "motorista"
          ? "driver"
          : companyUser.role === "usuario"
            ? "normal"
            : companyUser.role;

      setCompanyId(companyUser.company_id);
      setRole(normalizedRole as UserRole | null);
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