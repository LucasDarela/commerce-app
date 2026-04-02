"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal";
import { ReturnEquipmentModal } from "./ReturnEquipmentModal";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import type { Order } from "@/components/types/orders";
import { Input } from "../ui/input";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type GroupedByCustomer = {
  customerId: string;
  customerName: string;
  items: {
    loanId: string;
    equipmentName: string;
    quantity: number;
  }[];
};

type EquipmentRow = {
  id: string;
  name: string;
};

type LoanRow = {
  id: string;
  equipment_id: string;
  quantity: number | string | null;
  customer_id: string;
  customer_name: string | null;
  company_id?: string;
};

export default function LoanByCustomerPage() {
  const { user, companyId, loading } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [groupedData, setGroupedData] = useState<GroupedByCustomer[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = useCallback(async () => {
    if (!companyId) return;

    setIsFetching(true);

    const [loansRes, equipmentsRes] = await Promise.all([
      supabase
        .from("equipment_loans")
        .select("id, equipment_id, quantity, customer_id, customer_name, company_id")
        .eq("company_id", companyId)
        .eq("status", "active"),
      supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId),
    ]);

    const { data: loans, error: loansError } = loansRes;
    const { data: equipmentList, error: equipmentsError } = equipmentsRes;

    if (loansError || equipmentsError) {
      console.error("Erro ao buscar dados de comodato:", {
        loansError,
        equipmentsError,
      });
      toast.error("Erro ao buscar dados");
      setIsFetching(false);
      return;
    }

    const equipmentsMap = new Map(
      ((equipmentList as EquipmentRow[]) || []).map((eq) => [eq.id, eq.name]),
    );

    const grouped: Record<string, GroupedByCustomer> = {};

        for (const loan of ((loans as LoanRow[]) || [])) {
      const customerId = loan.customer_id;
      if (!customerId) continue;

      const customerName = loan.customer_name ?? "Desconhecido";
      const equipmentName =
        equipmentsMap.get(loan.equipment_id) || "Equipamento";

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
    setIsFetching(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyId) return;
    fetchData();
  }, [companyId, fetchData]);

  const filteredGroups = groupedData.filter((group) =>
    group.customerName.toLowerCase().includes(search.toLowerCase()),
  );

    function groupItemsByEquipment(
    items: { loanId: string; equipmentName: string; quantity: number }[],
  ) {
    const map = new Map<string, number>();

    for (const item of items) {
      const current = map.get(item.equipmentName) || 0;
      map.set(item.equipmentName, current + item.quantity);
    }

    return Array.from(map.entries()).map(([equipmentName, quantity]) => ({
      equipmentName,
      quantity,
    }));
  }

  if (loading || isFetching) {
    return <TableSkeleton />;
  }

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

      <div className="flex items-center gap-4 mb-4">
        <Input
          type="text"
          placeholder="Buscar cliente por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum empréstimo ativo encontrado.
        </p>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
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
                  }}
                >
                  Retornar Itens
                </Button>
              </div>

              <ul className="list-disc pl-6 text-sm text-muted-foreground mt-2">
                {groupItemsByEquipment(group.items).map((item, index) => (
                  <li key={`${group.customerId}-${item.equipmentName}-${index}`}>
                    {item.equipmentName} – {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {openModal && selectedCustomerId && companyId && (
        <ReturnEquipmentModal
          open={openModal}
          onOpenChange={setOpenModal}
          companyId={companyId}
          order={selectedOrder}
          user={user}
          customerId={selectedCustomerId}
          items={
            groupedData.find((g) => g.customerId === selectedCustomerId)
              ?.items ?? []
          }
          onReturnSuccess={() => {
            setOpenModal(false);
            fetchData();
          }}
          onOpenProductReturnModal={() => {}}
        />
      )}
    </div>
  );
}