"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function RegistrationConfirmed() {
  const sp = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 160,
      origin: { y: 0.6 },
    });

    const run = async () => {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Erro ao obter sessão:", sessionError);
        }

        let session = currentSession ?? null;
        const code = sp.get("code");

        if (!session && code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            code,
          );

          if (error) {
            console.error("Erro ao trocar code por sessão:", error);
          } else {
            session = data.session ?? null;
          }
        }

        if (!session?.user?.id) return;

        const key = `bootstrap_done_${session.user.id}`;

        if (typeof window !== "undefined" && !localStorage.getItem(key)) {
          try {
            const { error } = await supabase.rpc("bootstrap_user");

            if (error) {
              console.warn("bootstrap_user retornou erro:", error);
            }
          } catch (e) {
            console.warn("bootstrap_user falhou (ok continuar):", e);
          } finally {
            localStorage.setItem(key, "1");
          }
        }
      } catch (error) {
        console.error("Erro inesperado em RegistrationConfirmed:", error);
      }
    };

    run();
  }, [sp, supabase]);

  return (
    <main className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-6 p-6 rounded-2xl shadow-xl border bg-card max-w-md w-full animate-fade-in">
        <h1 className="text-2xl font-bold">🎉 Conta criada com sucesso!</h1>

        <p className="text-muted-foreground">
          Acesse a página de login para começar a usar o sistema.
        </p>

        <Link href="/login-signin">
          {/* <Button className="w-full">Ir para Login</Button> */}
        </Link>

        <Link href="/dashboard">
          <Button className="w-full">Ir para o Dashboard</Button>
        </Link>
      </div>
    </main>
  );
}