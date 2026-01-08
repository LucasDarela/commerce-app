import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export function createRouteSupabaseClient() {
  return createRouteHandlerClient<any>({ cookies });
}
export function createServerSupabaseClient() {
  return createServerComponentClient<any>({ cookies });
}
