import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: routes } = await supabase.from('delivery_routes').select('*').order('created_at', { ascending: false }).limit(5);
  return NextResponse.json({ routes });
}
