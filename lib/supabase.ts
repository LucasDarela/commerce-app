import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verifica se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou chave anônima ausente. Verifique seu .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

