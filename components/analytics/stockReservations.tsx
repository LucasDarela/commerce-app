"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Skeleton } from "@/components/ui/skeleton";

interface StockReservationReportProps {
  companyId: string;
  startDate: string;
  endDate?: string;
  supplierFilter?: string;
}

interface ReservationItem {
  appointment_date: string;
  product_name: string;
  quantity: number;
}

type RawOrderRow = {
  appointment_date: string;
  order_items: {
    quantity: number;
    products:
      | {
          name: string;
        }
      | {
          name: string;
        }[]
      | null;
  }[];
};

export function StockReservationReport({
  companyId,
  startDate,
  endDate,
}: StockReservationReportProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      if (!companyId || !startDate) {
        setReservations([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      let query = supabase
        .from("orders")
        .select("appointment_date, order_items(quantity, products(name))")
        .eq("company_id", companyId)
        .gte("appointment_date", startDate)
        .order("appointment_date", { ascending: true });

      if (endDate) {
        query = query.lte("appointment_date", endDate);
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error("Erro ao buscar relatório de reservas:", error);
        setReservations([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as RawOrderRow[];

      const flattened: ReservationItem[] = rows.flatMap((order) =>
        (order.order_items || []).map((item) => {
          const product = Array.isArray(item.products)
            ? item.products[0]
            : item.products;

          return {
            appointment_date: order.appointment_date,
            product_name: product?.name || "Produto desconhecido",
            quantity: Number(item.quantity) || 0,
          };
        }),
      );

      const grouped = new Map<string, Map<string, number>>();

      for (const item of flattened) {
        const dateLabel = format(new Date(item.appointment_date), "dd/MM/yyyy");

        if (!grouped.has(dateLabel)) {
          grouped.set(dateLabel, new Map<string, number>());
        }

        const productsMap = grouped.get(dateLabel)!;
        productsMap.set(
          item.product_name,
          (productsMap.get(item.product_name) || 0) + item.quantity,
        );
      }

      const result: ReservationItem[] = [];

      for (const [date, products] of grouped.entries()) {
        for (const [product_name, quantity] of products.entries()) {
          result.push({
            appointment_date: date,
            product_name,
            quantity,
          });
        }
      }

      setReservations(result);
      setLoading(false);
    };

    fetchReport();

    return () => {
      cancelled = true;
    };
  }, [companyId, startDate, endDate, supabase]);

  const groupedByDate = useMemo(() => {
    return reservations.reduce<Record<string, ReservationItem[]>>(
      (acc, item) => {
        if (!acc[item.appointment_date]) acc[item.appointment_date] = [];
        acc[item.appointment_date].push(item);
        return acc;
      },
      {},
    );
  }, [reservations]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate).map(([date, items]) => (
        <div key={date}>
          <div className="p-4 space-y-1">
            <h3 className="font-semibold">{date}</h3>
            {items.map((item, idx) => (
              <p key={`${date}-${item.product_name}-${idx}`}>
                {item.product_name} — {item.quantity} unidade(s)
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}