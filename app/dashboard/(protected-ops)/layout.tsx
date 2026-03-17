export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasValidSubscription } from "@/lib/billing/has-valid-subscription";
import PageUnderDevelopmentGate from "@/components/common/PageUnderDevelopmentGate";

const OWNER_EMAIL = "lucasdarela@live.com";

export default async function ProtectedOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login-signin");
  }

  const { data: cu, error: companyUserError } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const companyId = (cu as any)?.company_id;
  const companyUserRole = (cu as any)?.role ?? null;

  if (companyUserError || !companyId) {
    redirect("/dashboard/forbidden");
  }

  const rawRole =
    (user.user_metadata?.role as string | undefined) ||
    (user.user_metadata?.invited_role as string | undefined) ||
    (user.app_metadata?.role as string | undefined) ||
    companyUserRole ||
    null;

  const normalizedRole =
    rawRole === "driver"
      ? "driver"
      : rawRole === "normal"
        ? "normal"
        : rawRole;

  if (!normalizedRole || !["admin", "normal", "driver"].includes(normalizedRole)) {
    redirect("/dashboard/forbidden");
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("billing_exempt")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    redirect("/dashboard/forbidden");
  }

  const isBillingExempt = company?.billing_exempt === true;

  if (!isBillingExempt) {
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
  }

  return <>{children}</>;
}