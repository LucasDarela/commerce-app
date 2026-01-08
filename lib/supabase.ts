// import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

// export const supabase = createPagesBrowserClient();
// lib/supabase.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export const supabase = createClientComponentClient<Database>();
