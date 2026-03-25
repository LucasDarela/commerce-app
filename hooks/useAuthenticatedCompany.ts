"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type UserRole = "admin" | "normal" | "driver";

type AuthenticatedCompany = {
  user: any | null;
  companyId: string | null;
  role: UserRole | null;
  loading: boolean;
};

export function useAuthenticatedCompany(): AuthenticatedCompany {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<any | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setUser(null);
        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data: companyUser, error: companyError } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (companyError || !companyUser) {
        setCompanyId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setCompanyId(companyUser.company_id);
      setRole(companyUser.role as UserRole);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return { user, companyId, role, loading };
}