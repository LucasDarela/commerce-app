export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasValidSubscription } from "@/lib/billing/has-valid-subscription";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[dashboard layout] user:", user?.email ?? null);
console.log("[dashboard layout] userError:", userError ?? null);

  if (userError || !user) {
    redirect("/login-signin");
  }

  const { data: cu, error: companyUserError } = await supabase
    .from("company_users")
    .select("role, company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const companyId = (cu as any)?.company_id;
  const role = (cu as any)?.role;

  if (companyUserError || !companyId) {
    redirect("/dashboard/forbidden");
  }

  if (role !== "admin") {
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