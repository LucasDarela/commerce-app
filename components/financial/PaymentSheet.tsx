// components/data-financial/payment-sheet.tsx
"use client";

import { toast } from "sonner";
import { PaymentModal } from "@/components/payment-modal";
import { YourFinancialRecords } from "@/components/your-financial-modal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { FinancialRecord } from "@/components/financial/schema";
import type { CombinedRecord } from "./types";
import { isOrder } from "./utils";


export interface PaymentSheetProps {
  selectedOrder: CombinedRecord | null;
  setSelectedOrder: React.Dispatch<React.SetStateAction<CombinedRecord | null>>;
  selectedFinancial: FinancialRecord | null;
  setSelectedFinancial: (record: FinancialRecord | null) => void;
  isPaymentOpen: boolean;
  setIsPaymentOpen: (open: boolean) => void;
  isFinancialPaymentOpen: boolean;
  setIsFinancialPaymentOpen: (open: boolean) => void;
  refreshOrders: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export function PaymentSheet({
  selectedOrder,
  setSelectedOrder,
  selectedFinancial,
  setSelectedFinancial,
  isPaymentOpen,
  setIsPaymentOpen,
  isFinancialPaymentOpen,
  setIsFinancialPaymentOpen,
  refreshOrders,
  fetchAll,
}: PaymentSheetProps) {
  const supabase = createBrowserSupabaseClient();

  return (
    <>
      {selectedOrder && isOrder(selectedOrder) && (
        <PaymentModal
          order={{
            ...selectedOrder,
            total_payed: selectedOrder.total_payed ?? 0,
          }}
          open={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            refreshOrders();
            setIsPaymentOpen(false);
          }}
        />
      )}

      {selectedFinancial && (
        <YourFinancialRecords
          open={isFinancialPaymentOpen}
          financial={selectedFinancial}
          onClose={() => setIsFinancialPaymentOpen(false)}
          onSuccess={async () => {
            await fetchAll();
            setIsFinancialPaymentOpen(false);
            setSelectedFinancial(null);
            toast.success("Nota marcada como paga!");
          }}
        />
      )}
    </>
  );
}
