"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function toBool(v: any): boolean | null {
  if (v === true || v === false) return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;

  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "t", "1", "yes", "sim"].includes(s)) return true;
    if (["false", "f", "0", "no", "nao", "não", "não"].includes(s))
      return false;
  }

  if (String(v).toUpperCase() === "TRUE") return true;
  if (String(v).toUpperCase() === "FALSE") return false;

  return null;
}

export function useCanEmitNfe({
  orderId,
  customerId,
  emitNfFromOrder,
  emitNfFromCustomer,
}: {
  orderId?: string;
  customerId?: string | null;
  emitNfFromOrder?: boolean | null;
  emitNfFromCustomer?: boolean | null;
}) {
  const supabase = createClientComponentClient();
  const [canEmit, setCanEmit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const fetchEmit = async () => {
      setLoading(true);
      setError(null);
      let finalCanEmit = false;

      try {
        // prioridade: cliente
        if (emitNfFromCustomer !== undefined && emitNfFromCustomer !== null) {
          finalCanEmit = !!emitNfFromCustomer;
        }
        // depois: pedido
        else if (emitNfFromOrder !== undefined && emitNfFromOrder !== null) {
          finalCanEmit = !!emitNfFromOrder;
        }
        // fallback: buscar no Supabase
        else if (customerId) {
          const { data, error } = await supabase
            .from("customers")
            .select("emit_nf")
            .eq("id", customerId)
            .maybeSingle();

          if (error) {
            setError("Erro ao buscar cliente");
            finalCanEmit = false;
          } else {
            finalCanEmit = !!data?.emit_nf;
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro inesperado");
        finalCanEmit = false;
      } finally {
        if (!canceled) {
          setCanEmit(finalCanEmit);
          setLoading(false);
        }
      }
    };

    fetchEmit();

    return () => {
      canceled = true;
    };
  }, [emitNfFromCustomer, emitNfFromOrder, customerId, supabase]);

  return { canEmit, loading, error };
}
