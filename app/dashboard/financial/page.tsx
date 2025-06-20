"use client";

import { useEffect, useState } from "react";
import { fetchOrders } from "@/lib/fetchOrders";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import DataFinancialTable from "@/components/financial/DataFinancialTable";
import { Order } from "@/components/types/order";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function FinancialPage() {
  const { companyId } = useAuthenticatedCompany();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const getData = async () => {
      setLoading(true);
      const data = await fetchOrders(companyId);
      setOrders(
        data
          .filter((o) => !!o.payment_method && !!o.id)
          .map((o) => ({
            ...o,
            id: o.id!,
            payment_method: o.payment_method ?? "Pix",
          })),
      );
      setLoading(false);
    };

    getData();
  }, [companyId]);

  if (loading) {
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
