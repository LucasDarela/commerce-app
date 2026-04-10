"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type UserRole = "admin" | "normal" | "driver";

type AuthenticatedCompany = {
  user: any | null;
  companyId: string | null;
  companyName: string | null;
  role: UserRole | null;
  loading: boolean;
  mobileOfflineEnabled: boolean;
  planName: string | null;
};

export function useAuthenticatedCompany(): AuthenticatedCompany {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<any | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mobileOfflineEnabled, setMobileOfflineEnabled] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Busca dados básicos do usuário e empresa (Join seguro)
      const { data: companyUser, error: companyError } = await supabase
        .from("company_users")
        .select(`
          company_id, 
          role, 
          companies(id, name, mobile_offline_enabled, billing_exempt)
        `)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (companyError || !companyUser) {
        setLoading(false);
        return;
      }

      const compData = companyUser.companies as any;
      setCompanyId(companyUser.company_id);
      setCompanyName(compData?.name || null);
      setRole(companyUser.role as UserRole);
      setMobileOfflineEnabled(!!compData?.mobile_offline_enabled);

      // Identifica primeiro se a empresa é isenta de cobrança
      if (compData?.billing_exempt) {
        setPlanName("Vitalício");
      } else {
        // Busca o plano atual de forma independente
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, plans(name)")
          .eq("company_id", companyUser.company_id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (subData) {
          setPlanName((subData as any).plans?.name || "Gratuito");
        } else {
          setPlanName("Gratuito");
        }
      }


    } catch (err) {
      console.error("Erro no hook useAuthenticatedCompany:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return { user, companyId, companyName, role, loading, mobileOfflineEnabled, planName };
}