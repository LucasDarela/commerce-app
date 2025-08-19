"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const typeParam = search.get("type") as
      | "invite"
      | "signup"
      | "recovery"
      | "magiclink"
      | "email_change"
      | null;

    const explicitNext = search.get("next");
    const computedNext =
      explicitNext ??
      (typeParam === "invite" || typeParam === "recovery"
        ? "/set-password"
        : "/marketing/registration-confirmed");

    // Heurística simples: só tentamos PKCE se existir algum item de PKCE/local token no storage
    const hasPkce = () => {
      try {
        return Object.keys(localStorage).some((k) =>
          /sb-.*-auth-token|code_verifier|pkce/i.test(k),
        );
      } catch {
        return false;
      }
    };

    async function run() {
      try {
        // 1) verifyOtp (token_hash + type) → convites/confirm/recovery
        const token_hash =
          search.get("token_hash") ?? search.get("token") ?? undefined;
        if (token_hash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            type: typeParam,
            token_hash,
          });
          if (!error) {
            router.replace(computedNext);
            return;
          } else {
            console.error("[callback] verifyOtp erro:", error.message);
          }
        }

        // 2) Hash com access/refresh (alguns templates)
        const hash = window.location.hash || "";
        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get("access_token") || "";
          const refresh_token = params.get("refresh_token") || "";
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!error) {
              history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search,
              );
              router.replace(computedNext);
              return;
            } else {
              console.error("[callback] setSession erro:", error.message);
            }
          }
        }

        // 3) PKCE OAuth/SSO (só se houver evidência de PKCE salvo)
        const code = search.get("code");
        if (code && hasPkce()) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            router.replace(computedNext);
            return;
          } else {
            console.error(
              "[callback] exchangeCodeForSession erro:",
              error.message,
            );
          }
        } else if (code) {
          // Evita o erro chato no console quando não é fluxo PKCE
          console.info(
            "[callback] ignorando ?code sem PKCE (não é OAuth/SSO iniciado aqui).",
          );
        }

        // 4) Já tem sessão?
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(computedNext);
          return;
        }

        // 5) Fallback
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
