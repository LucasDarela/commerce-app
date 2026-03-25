// components/redirect-if-authenticated.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Loader2 } from "lucide-react";

export function RedirectIfAuthenticated() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    };

    checkSession();
  }, [router, supabase]);

  if (!checking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p>Você está sendo redirecionado...</p>
    </div>
  );
}
