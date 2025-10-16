// app/dashboard/orders/add/_client-form.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOverdueCheck } from "@/components/billing/useOverdueCheck";
import { OverdueModal } from "@/components/billing/OverdueModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/components/types/supabase";

type Props = {
  defaultCustomerId?: string | null;
};

export default function NewOrderForm({ defaultCustomerId = null }: Props) {
  const supabase = createClientComponentClient<Database>();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [total, setTotal] = useState<number>(150);
  const [saving, setSaving] = useState(false);

  const {
    check,
    items: overdueItems,
    loading: checking,
    error: checkError,
  } = useOverdueCheck();

  const [role, setRole] = useState<"admin" | "member" | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user?.id) return setRole("member");
      const { data: row } = await supabase
        .from("company_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setRole((row?.role as "admin" | "member" | null) ?? "member");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canOverride = role === "admin";

  const [modalOpen, setModalOpen] = useState(false);

  async function createOrder(payload: any) {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Erro ao criar pedido (HTTP ${res.status})`);
    }
    return res.json();
  }

  async function guardedCreateOrder({
    override = false,
  }: {
    override?: boolean;
  }) {
    try {
      setSaving(true);
      const payload = {
        customer_id: customerId,
        total,
        payment_method: "Boleto",
        override_overdue: !!override,
      };
      await createOrder(payload);
      toast.success("Pedido criado!");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar pedido");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Selecione o cliente");
      return;
    }

    const { hasOverdue } = await check(customerId);
    if (checkError) {
      toast.error(checkError);
      return;
    }

    if (!hasOverdue) {
      guardedCreateOrder({ override: false });
      return;
    }

    setModalOpen(true);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="Customer ID (uuid)"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Total"
            value={total}
            onChange={(e) => {
              const v = parseFloat(e.target.value || "0");
              setTotal(Number.isFinite(v) ? v : 0);
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || checking}>
            {checking
              ? "Verificando..."
              : saving
                ? "Salvando..."
                : "Criar pedido"}
          </Button>
        </div>
      </form>

      <OverdueModal
        open={modalOpen}
        items={overdueItems}
        onClose={() => setModalOpen(false)}
        canOverride={canOverride}
        onProceed={() => {
          setModalOpen(false);
          if (canOverride) {
            void guardedCreateOrder({ override: true });
          }
        }}
      />
    </>
  );
}
