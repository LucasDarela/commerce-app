export function hasValidSubscription(subscription: {
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