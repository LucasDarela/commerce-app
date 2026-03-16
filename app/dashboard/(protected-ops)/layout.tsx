export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasValidSubscription } from "@/lib/billing/has-valid-subscription";

export default async function ProtectedOpsLayout({
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

  const { data: cu, error: companyUserError } = await supabase
    .from("company_users")
    .select("role, company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (cu as any)?.role;
  const companyId = (cu as any)?.company_id;

  if (companyUserError || !companyId) {
    redirect("/dashboard/forbidden");
  }

  if (!["admin", "normal", "driver"].includes(role)) {
    redirect("/dashboard/forbidden");
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status, cancel_at_period_end, current_period_end")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    subscriptionError ||
    !subscription ||
    !hasValidSubscription(subscription)
  ) {
    redirect("/dashboard/billing");
  }

  return <>{children}</>;
}