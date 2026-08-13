require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Routes:', data);
}
run();
