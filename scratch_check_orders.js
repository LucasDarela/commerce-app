import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const envVars = envFile.split("\n").reduce((acc, line) => {
  const [key, ...value] = line.split("=");
  if (key && value.length > 0) acc[key.trim()] = value.join("=").trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, boleto_id, payment_status, payment_method, created_at")
    .not("boleto_id", "is", null)
    .not("boleto_id", "ilike", "pay_%") // exclude Asaas
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("Recent Inter orders with boleto_id:", data);
}

main();
