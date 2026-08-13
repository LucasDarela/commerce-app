// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: route } = await supabase.from('delivery_routes').select('*').order('created_at', {ascending: false}).limit(1).single();
  console.log("Last Route:", route);
  
  if (route) {
    const { data: orders } = await supabase.from('orders').select('id, driver_id, route_number').eq('route_number', route.route_number);
    console.log("Orders in this route:", orders);
  }
}
check();
