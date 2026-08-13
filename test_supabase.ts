// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('delivery_routes').select('*').limit(1);
  console.log('Routes:', JSON.stringify(data, null, 2));
  
  const { data: cols } = await supabase.rpc('get_columns', { table_name: 'delivery_routes' }).catch(() => ({data: null}));
  console.log('Columns via RPC (if exists):', cols);
}
test();
