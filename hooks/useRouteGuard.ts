"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { canAccessRoute } from "@/lib/permissions";

export function useRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useAuthenticatedCompany();

  useEffect(() => {
    if (loading) return;
    if (!role) return;

    if (!canAccessRoute(role, pathname)) {
      router.replace("/dashboard/orders");
    }
  }, [loading, role, pathname, router]);

  return { loading, role };
}