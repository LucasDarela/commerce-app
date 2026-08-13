const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('delivery_routes').select('id, driver_id, profiles(username)').order('created_at', { ascending: false }).limit(5);
  console.log('Routes:', JSON.stringify(data, null, 2));
}
test();
