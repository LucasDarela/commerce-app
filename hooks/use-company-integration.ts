"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// ✅ se você quer “destravar”, pode trocar por <any> aqui e remover o import do Database
import type { Database } from "@/lib/database.types";

export function useCompanyIntegration(provider: string) {
  const supabase = createClientComponentClient<Database>();
  // const supabase = createClientComponentClient<any>();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchIntegration() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        if (!cancelled) {
          setError("Usuário não autenticado.");
          setLoading(false);
        }
        return;
      }

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser?.company_id) {
        if (!cancelled) {
          setError("Empresa não encontrada.");
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("company_integrations")
        .select("access_token")
        .eq("company_id", companyUser.company_id)
        .eq("provider", provider as any) // opcional: remove quando tipar provider direito
        .single();

      if (!cancelled) {
        if (error || !data?.access_token)
          setError("Integração não encontrada.");
        else setAccessToken(data.access_token);
        setLoading(false);
      }
    }

    fetchIntegration();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  return { accessToken, loading, error };
}
