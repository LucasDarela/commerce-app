"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import LandingLayout from "./LandingLayout";

export default function LandingPage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router, supabase]);

  return <LandingLayout />;
}
