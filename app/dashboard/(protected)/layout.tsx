// app/dashboard/(protected)/layout.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function hasValidSubscription(subscription: {
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
}) {
  const now = new Date();

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  if (subscription.status === "trialing") {
    return true;
  }

  if (subscription.status === "active") {
    if (subscription.cancel_at_period_end) {
      return !!periodEnd && periodEnd > now;
    }

    return true;
  }

  return false;
}

export default async function AdminGateLayout({
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

  if (companyUserError || role !== "admin") {
    redirect("/dashboard/forbidden");
  }

  if (!companyId) {
    redirect("/dashboard/billing");
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