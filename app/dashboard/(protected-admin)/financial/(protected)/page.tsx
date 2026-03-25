"use client";

import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import DataFinancialTable from "@/components/financial/DataFinancialTable";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function FinancialPage() {
  const { companyId, loading } = useAuthenticatedCompany();

  if (loading || !companyId) {
    return <TableSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <DataFinancialTable />
        </div>
      </div>
    </div>
  );
}