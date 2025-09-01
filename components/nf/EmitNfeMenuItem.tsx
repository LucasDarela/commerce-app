"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  orderId: string;
  customerId?: string | null;
  emitNfFromOrder?: boolean | number | string | null; // orders.emit_nf (se vier na query)
  emitNfFromCustomer?: boolean | number | string | null; // customers.emit_nf (se vier na query)
  showDebug?: boolean;
};

function toBool(v: any): boolean | null {
  if (v === true || v === false) return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "t", "1", "yes", "sim"].includes(s)) return true;
    if (["false", "f", "0", "no", "nao", "não", "não"].includes(s))
      return false;
  }
  return null;
}

export default function EmitNfeMenuItem({
  orderId,
  customerId,
  emitNfFromOrder,
  emitNfFromCustomer,
  showDebug = false,
}: Props) {
  const supabase = createClientComponentClient();

  // 1) tenta decidir imediatamente a partir dos valores já carregados
  const initial = useMemo(() => {
    const resolved = emitNfFromCustomer ?? emitNfFromOrder; // prioridade para o cadastro do cliente
    const parsed = toBool(resolved);
    if (showDebug) {
      console.log("[EmitNfeMenuItem] initial", {
        emitNfFromCustomer,
        emitNfFromOrder,
        parsed,
        typeofCustomer: typeof emitNfFromCustomer,
        typeofOrder: typeof emitNfFromOrder,
      });
    }
    return parsed;
  }, [emitNfFromCustomer, emitNfFromOrder, showDebug]);

  const [canEmit, setCanEmit] = useState<boolean | null>(initial);
  const [lastError, setLastError] = useState<string | null>(null);

  // 2) se não veio em props, busca direto no customers.emit_nf
  useEffect(() => {
    if (initial !== null) return; // já resolvido
    if (!customerId) return; // sem id do cliente pra buscar

    (async () => {
      setLastError(null);
      const { data, error } = await supabase
        .from("customers")
        .select("emit_nf")
        .eq("id", customerId)
        .maybeSingle();

      if (showDebug) {
        console.log("[EmitNfeMenuItem] fetched customers.emit_nf", {
          customerId,
          error,
          data,
        });
      }

      if (error) {
        setLastError(error.message || "Erro ao buscar cliente");
        setCanEmit(null);
        return;
      }

      setCanEmit(toBool(data?.emit_nf));
    })();
  }, [customerId, initial, supabase, showDebug]);

  // regra: habilita SOMENTE quando for explicitamente true
  const isBlocked = canEmit !== true;

  if (isBlocked) {
    const tooltipMsg =
      lastError ??
      (canEmit === null
        ? "Não foi possível determinar a permissão de NF-e para este cliente."
        : "Este cliente não está habilitado para emissão de NF-e");

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* não usa disabled para permitir tooltip; também bloqueia o select */}
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="cursor-not-allowed text-muted-foreground opacity-60"
            >
              Emitir NF-e
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipMsg}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // habilitado
  return (
    <DropdownMenuItem asChild>
      <Link href={`/dashboard/orders/${orderId}/nfe`}>Emitir NF-e</Link>
    </DropdownMenuItem>
  );
}
