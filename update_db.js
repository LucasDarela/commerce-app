const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    acc[match[1].trim()] = val;
  }
  return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const query = `
  ALTER TABLE fiscal_operations 
  ADD COLUMN IF NOT EXISTS aliquota_icms_uf_dest numeric(10,2),
  ADD COLUMN IF NOT EXISTS aliquota_icms_inter numeric(10,2);
`;
// If using service role, we might not have a direct way to run raw SQL unless using pg package.
// Let's use the REST API rpc to execute SQL if possible, or just note that the user needs to run it.
