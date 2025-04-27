import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createPagesBrowserClient({
  global: {
    headers: {
      Accept: "application/json",
    },
  },
});