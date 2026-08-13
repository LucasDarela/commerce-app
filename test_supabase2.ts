// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('orders').update({
    driver_id: '7ca41a66-0318-48aa-8752-b69c040b156d',
    route_number: 1,
    delivery_status: 'Entregar'
  }).eq('id', '1df7c4a5-8709-4ca8-bc62-c4de04e93996').select();
  console.log("Update Data:", data);
  console.log("Update Error:", error);
}
check();
