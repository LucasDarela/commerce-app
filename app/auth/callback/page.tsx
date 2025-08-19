// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function run() {
      if (typeof window === "undefined") return;

      // --- 1) Coletar params tanto da query quanto do hash
      const queryType = search.get("type") as
        | "invite"
        | "signup"
        | "recovery"
        | "magiclink"
        | "email_change"
        | null;

      const queryNext = search.get("next");

      const hash = window.location.hash || "";
      const hashParams = new URLSearchParams(
        hash.startsWith("#") ? hash.slice(1) : hash,
      );
      const hashType = (hashParams.get("type") as typeof queryType) || null;
      const hashNext = hashParams.get("next");

      const typeParam = queryType ?? hashType ?? null;

      // prioridade: next explícito (query) > next no hash > fallback pelo type
      const explicitNext = queryNext ?? hashNext ?? null;
      const computedNext =
        explicitNext ??
        (typeParam === "invite" || typeParam === "recovery"
          ? "/set-password"
          : "/marketing/registration-confirmed");

      // Heurística: só tentamos PKCE se houver evidência de PKCE no storage
      const hasPkce = () => {
        try {
          return Object.keys(localStorage).some((k) =>
            /sb-.*-auth-token|code_verifier|pkce/i.test(k),
          );
        } catch {
          return false;
        }
      };

      try {
        // 2) verifyOtp (fluxo token_hash + type)
        const token_hash =
          search.get("token_hash") ?? search.get("token") ?? undefined;
        if (token_hash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            type: typeParam,
            token_hash,
          });
          if (!error) return router.replace(computedNext);
          console.error("[callback] verifyOtp erro:", error.message);
        }

        // 3) Hash com access/refresh (implicit)
        if (hash.includes("access_token")) {
          const access_token = hashParams.get("access_token") || "";
          const refresh_token = hashParams.get("refresh_token") || "";
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!error) {
              // limpa o hash da URL
              history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search,
              );
              return router.replace(computedNext);
            }
            console.error("[callback] setSession erro:", error.message);
          }
        }

        // 4) PKCE OAuth/SSO
        const code = search.get("code");
        if (code && hasPkce()) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) return router.replace(computedNext);
          console.error(
            "[callback] exchangeCodeForSession erro:",
            error.message,
          );
        } else if (code) {
          console.info(
            "[callback] ?code sem PKCE; ignorando (não é OAuth/SSO iniciado aqui).",
          );
        }

        // 5) Já tem sessão?
        const { data } = await supabase.auth.getSession();
        if (data.session) return router.replace(computedNext);

        // 6) Fallback
        router.replace("/login-signin");
      } catch (err) {
        console.error("[callback] erro inesperado:", err);
        router.replace("/login-signin");
      }
    }

    run();
  }, [router, search, supabase]);

  return <p className="p-6">Validando acesso...</p>;
}
