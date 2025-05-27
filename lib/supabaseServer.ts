// lib/supabaseServer.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/components/types/supabase"

export function supabaseServer() {
  const cookieStore = cookies() as any 

  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })
}