// lib/supabaseServer.ts

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";

export function supabaseServer() {
  return createServerComponentClient<Database>({
    cookies,
  });
}