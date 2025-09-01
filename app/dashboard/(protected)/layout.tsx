// app/dashboard/(protected)/layout.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function AdminGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login-signin");

  const { data: cu, error } = await supabase
    .from("company_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || cu?.role !== "admin") redirect("/dashboard/forbidden");

  return <>{children}</>;
}
