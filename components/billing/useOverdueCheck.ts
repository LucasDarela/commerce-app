// components/billing/useOverdueCheck.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";
import type { OverdueItem } from "./types";

export function useOverdueCheck() {
  const supabase = createClientComponentClient();
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 👇 agora recebe também companyId
  async function check(customerId: string, companyId?: string | null) {
    try {
      setLoading(true);
      setError(null);

      const params = companyId
        ? { p_customer_id: customerId, p_company_id: companyId }
        : { p_customer_id: customerId }; // se sua função só tiver 1 param, ainda funciona

      const { data, error } = await supabase.rpc(
        "customer_overdue_boletos",
        params,
      );
      if (error) throw error;

      const mapped: OverdueItem[] = (data ?? []).map((row: any) => ({
        order_id: row.order_id,
        note_number: row.note_number,
        due_date: row.due_date,
        total: row.total,
        payment_status: row.payment_status ?? null,
      }));

      setItems(mapped);
      return { hasOverdue: mapped.length > 0, items: mapped };
    } catch (e: any) {
      setError(e?.message ?? "Falha ao consultar boletos vencidos");
      setItems([]);
      return { hasOverdue: false, items: [] as OverdueItem[] };
    } finally {
      setLoading(false);
    }
  }

  return { items, hasOverdue: items.length > 0, check, loading, error };
}
