import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase"; 

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
}