"use client";

import { useEffect, useState } from "react";
import { fetchOrders } from "@/lib/fetchOrders";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { DataTable } from "@/components/data-table";
import { Order } from "@/components/types/order";

export default function OrdersPage() {
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
          .filter((o): o is Order => !!o.id)
          .map((o) => ({
            ...o,
            id: o.id!,
          })),
      );
      setLoading(false);
    };

    getData();
  }, [companyId]);

  if (loading) return <p className="p-4">Loading Orders...</p>;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {companyId && <DataTable data={orders} companyId={companyId} />}
        </div>
      </div>
    </div>
  );
}
