// app/financial/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FinancialAdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login-signin");

  const { data: cu, error } = await supabase
    .from("company_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (cu as any)?.role;
  if (error || role !== "admin") redirect("/dashboard/forbidden");

  return <>{children}</>;
}
