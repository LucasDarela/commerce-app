"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { DataTable } from "@/components/data-table";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function OrdersPage() {
  const { companyId, loading, user, role } = useAuthenticatedCompany();

  if (loading || !companyId) {
    return <TableSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <DataTable companyId={companyId} user={user} role={role} />
        </div>
      </div>
    </div>
  );
}