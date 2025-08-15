"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  companyId: string;
  startDate: string;
  endDate?: string;
  customerId?: string;
}

type LoanEvent = {
  kind: "loan" | "return";
  dateISO: string;
  dateLabel: string;
  equipmentName: string;
  quantity: number;
  noteNumber?: string | null;
  remainingAfter?: number;
};

export function EquipmentLoansHistoryReport({
  companyId,
  startDate,
  endDate,
  customerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LoanEvent[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!companyId || !startDate) return;
      setLoading(true);

      let loanQ = supabase
        .from("equipment_loans")
        .select(
          "loan_date, note_number, quantity, customer_id, equipment_id, equipments(name)",
        )
        .eq("company_id", companyId)
        .gte("loan_date", startDate);

      if (endDate) loanQ = loanQ.lte("loan_date", endDate);
      if (customerId) loanQ = loanQ.eq("customer_id", customerId);

      const { data: loanRows, error: loanErr } = await loanQ;
      if (loanErr) console.error("Erro empréstimos:", loanErr);

      const loanEvents: LoanEvent[] = (loanRows ?? []).map((r: any) => ({
        kind: "loan",
        dateISO: r.loan_date,
        dateLabel: format(new Date(r.loan_date), "dd/MM/yyyy"),
        equipmentName: r.equipments?.name ?? "Equipamento",
        quantity: r.quantity ?? 0, // quantidade emprestada na criação
        noteNumber: r.note_number ?? null,
      }));

      let retQ = supabase
        .from("equipment_loan_returns")
        .select(
          "return_date, note_number, returned_quantity, remaining_quantity, customer_id, equipment_id, equipments(name)",
        )
        .eq("company_id", companyId)
        .gte("return_date", startDate);

      if (endDate) retQ = retQ.lte("return_date", endDate);
      if (customerId) retQ = retQ.eq("customer_id", customerId);

      const { data: retRows, error: retErr } = await retQ;
      if (retErr) console.error("Erro devoluções:", retErr);

      const returnEvents: LoanEvent[] = (retRows ?? []).map((r: any) => ({
        kind: "return",
        dateISO: r.return_date,
        dateLabel: format(new Date(r.return_date), "dd/MM/yyyy"),
        equipmentName: r.equipments?.name ?? "Equipamento",
        quantity: r.returned_quantity ?? 0,
        remainingAfter: r.remaining_quantity ?? 0,
        noteNumber: r.note_number ?? null,
      }));

      const merged = [...loanEvents, ...returnEvents].sort(
        (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
      );

      setEvents(merged);
      setLoading(false);
    };

    run();
  }, [companyId, startDate, endDate, customerId]);

  const groupedByDate = useMemo(() => {
    return events.reduce<Record<string, LoanEvent[]>>((acc, e) => {
      (acc[e.dateLabel] ||= []).push(e);
      return acc;
    }, {});
  }, [events]);

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
              <p key={idx}>
                {item.equipmentName} —{" "}
                {item.kind === "loan" ? (
                  <>emprestado: {item.quantity} unidade(s)</>
                ) : (
                  <>
                    devolvido: {item.quantity} unidade(s)
                    {typeof item.remainingAfter === "number"
                      ? ` — ficou: ${item.remainingAfter}`
                      : ""}
                  </>
                )}
                {item.noteNumber ? ` — Nota ${item.noteNumber}` : ""}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
