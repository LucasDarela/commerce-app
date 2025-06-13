// components/data-financial/payment-sheet.tsx
"use client";

import { toast } from "sonner";
import { PaymentModal } from "@/components/payment-modal";
import { YourFinancialRecords } from "@/components/your-financial-modal";
import { Order } from "@/components/types/orders";
import { FinancialRecord } from "@/components/types/financial";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { CombinedRecord } from "./DataFinancialTable";
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
  const supabase = createClientComponentClient();

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
