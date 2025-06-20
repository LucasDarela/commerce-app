"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconPlus,
} from "@tabler/icons-react";
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal";
import { ReturnEquipmentModal } from "./ReturnEquipmentModal";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import type { Order } from "@/components/types/orders";

type LoanWithDetails = {
  id: string;
  quantity: number;
  note_number: string;
  note_date: string;
  customer_id: string;
  customer: { name: string };
  equipment: { name: string };
};

type GroupedByCustomer = {
  customerId: string;
  customerName: string;
  items: {
    loanId: string;
    equipmentName: string;
    quantity: number;
  }[];
};

export default function LoanByCustomerPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();
  const [groupedData, setGroupedData] = useState<GroupedByCustomer[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchData = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("equipment_loans")
      .select("id, equipment_id, quantity, customer_id, customer_name")
      .eq("status", "active");

    const { data: equipmentList } = await supabase
      .from("equipments")
      .select("id, name")
      .eq("company_id", companyId);

    if (!error && data && equipmentList) {
      const grouped: Record<string, GroupedByCustomer> = {};

      for (const loan of data) {
        const customerId = loan.customer_id;
        const customerName = loan.customer_name ?? "Desconhecido";
        const equipmentName =
          equipmentList.find((eq) => eq.id === loan.equipment_id)?.name ||
          "Equipamento";

        if (!grouped[customerId]) {
          grouped[customerId] = {
            customerId,
            customerName,
            items: [],
          };
        }

        grouped[customerId].items.push({
          loanId: loan.id,
          equipmentName,
          quantity: Number(loan.quantity) || 1,
        });
      }

      setGroupedData(Object.values(grouped));
    } else {
      toast.error("Erro ao buscar dados");
      console.error(error);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  return (
    <div className="w-full px-6 py-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold mb-6">Equipamentos por Cliente</h1>
        <Button onClick={() => setIsLoanModalOpen(true)}>
          Novo Empréstimo
        </Button>

        <LoanEquipmentModal
          open={isLoanModalOpen}
          onOpenChange={setIsLoanModalOpen}
          onLoanSaved={fetchData}
        />
      </div>

      {groupedData.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum empréstimo ativo encontrado.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group) => (
            <div key={`customer-${group.customerId}`} className="mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-primary">
                  {group.customerName}
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedCustomerId(group.customerId);
                    setOpenModal(true);
                    setSelectedItems([]);
                  }}
                >
                  Retornar Itens
                </Button>
              </div>

              <ul className="list-disc pl-6 text-sm text-muted-foreground mt-2">
                {group.items.map((item, index) => (
                  <li
                    key={`${group.customerId}-${item.equipmentName}-${index}`}
                  >
                    {item.equipmentName} – {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {openModal && selectedCustomerId && (
        <ReturnEquipmentModal
          open={openModal}
          onOpenChange={setOpenModal}
          order={selectedOrder}
          user={user}
          customerId={selectedCustomerId}
          items={
            groupedData.find((g) => g.customerId === selectedCustomerId)
              ?.items ?? []
          }
          onReturnSuccess={() => {
            setOpenModal(false);
            setSelectedItems([]);
            fetchData();
          }}
          onOpenProductReturnModal={() => {}}
        />
      )}
    </div>
  );
}
