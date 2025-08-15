"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegistrationConfirmed() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    confetti({ particleCount: 100, spread: 160, origin: { y: 0.6 } });

    const run = async () => {
      const { data: s1 } = await supabase.auth.getSession();
      let session = s1?.session;
      const code = sp.get("code");

      if (!session && code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!error) session = data.session ?? null;
      }

      // 2) com sessão em mãos, roda o bootstrap (idempotente)
      if (session) {
        const key = `bootstrap_done_${session.user.id}`;
        if (!localStorage.getItem(key)) {
          try {
            await supabase.rpc("bootstrap_user");
          } catch (e) {
            console.warn("bootstrap_user falhou (ok continuar):", e);
          } finally {
            localStorage.setItem(key, "1");
          }
        }
      }
    };

    run();
  }, [sp]);

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
        {/* Se quiser já mandar pro app, troque o link acima por: */}
        <Link href="/dashboard">
          <Button className="w-full">Ir para o Dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
