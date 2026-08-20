const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Extract env vars
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
  const { data: integ, error } = await supabase
    .from("company_integrations")
    .select("company_id")
    .eq("provider", "banco_inter")
    .limit(1)
    .single();

  if (error || !integ) {
    console.log("No Inter integration found.");
    return;
  }
  
  console.log("Found inter integration for company:", integ.company_id);
  
  // Now we need to use interFetch. But wait, I can just use the server running locally, or I can import the TS file.
  // Actually, I can just fetch it directly.
}

main();
