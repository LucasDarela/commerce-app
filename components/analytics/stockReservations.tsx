"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
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

export function StockReservationReport({
  companyId,
  startDate,
  endDate,
}: StockReservationReportProps) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!companyId || !startDate) return;

      setLoading(true);

      let query = supabase
        .from("orders")
        .select("appointment_date, order_items(quantity, products(name))")
        .eq("company_id", companyId)
        .gte("appointment_date", startDate);

      if (endDate) {
        query = query.lte("appointment_date", endDate);
      }

      const { data, error } = await query;

      if (!error && data) {
        const flattened: ReservationItem[] = data.flatMap((order: any) =>
          order.order_items.map((item: any) => ({
            appointment_date: order.appointment_date,
            product_name: item.products?.name || "Produto desconhecido",
            quantity: item.quantity,
          })),
        );

        // Agrupar por data e produto
        const grouped: Record<string, Record<string, number>> = {};

        flattened.forEach((item) => {
          const date = format(new Date(item.appointment_date), "dd/MM/yyyy");
          if (!grouped[date]) grouped[date] = {};
          if (!grouped[date][item.product_name])
            grouped[date][item.product_name] = 0;
          grouped[date][item.product_name] += item.quantity;
        });

        // Transformar agrupamento em lista de exibição
        const result: ReservationItem[] = [];
        Object.entries(grouped).forEach(([date, products]) => {
          Object.entries(products).forEach(([product_name, quantity]) => {
            result.push({ appointment_date: date, product_name, quantity });
          });
        });

        setReservations(result);
      } else {
        console.error("Erro ao buscar relatório de reservas:", error);
      }

      setLoading(false);
    };

    fetchReport();
  }, [companyId, startDate, endDate]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const groupedByDate = reservations.reduce<Record<string, ReservationItem[]>>(
    (acc, item) => {
      if (!acc[item.appointment_date]) acc[item.appointment_date] = [];
      acc[item.appointment_date].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate).map(([date, items]) => (
        <div key={date}>
          <div className="p-4 space-y-1">
            <h3 className="font-semibold">{date}</h3>
            {items.map((item, idx) => (
              <p key={idx}>
                {item.product_name} — {item.quantity} unidade(s)
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
