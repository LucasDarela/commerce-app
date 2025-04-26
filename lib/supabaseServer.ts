import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";
import { cookies } from "next/headers";

export const supabaseServer = createServerComponentClient<Database>({
  cookies,
});