"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";

type EquipmentOption = {
  id: string;
  name: string;
};

type LoanItem = {
  equipment_id: string;
  name: string;
};

export default function LoanEquipmentComponent() {
  const { companyId } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEquipments = useCallback(async () => {
    if (!companyId) return;

    setLoadingEquipments(true);

    const { data, error } = await supabase
      .from("equipments")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar equipamentos:", error);
      toast.error("Erro ao buscar equipamentos");
    } else {
      setEquipmentList((data as EquipmentOption[]) || []);
    }

    setLoadingEquipments(false);
  }, [companyId, supabase]);

  const handleAddItem = () => {
    if (!selectedEquipmentId) return;

    const equipment = equipmentList.find((e) => e.id === selectedEquipmentId);
    if (!equipment) return;

    setLoanItems((prev) => [
      ...prev,
      { equipment_id: equipment.id, name: equipment.name },
    ]);

    setSelectedEquipmentId("");
  };

  const handleRemoveItem = (index: number) => {
    setLoanItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!companyId || !customerName.trim() || loanItems.length === 0) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        company_id: companyId,
        customer_name: customerName.trim(),
        items: loanItems,
      };

      const { error } = await supabase.from("equipment_loans").insert([payload]);

      if (error) {
        console.error("Erro ao salvar empréstimo:", error);
        toast.error("Erro ao salvar empréstimo");
        return;
      }

      toast.success("Empréstimo registrado com sucesso");
      setCustomerName("");
      setLoanItems([]);
      setSelectedEquipmentId("");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Registrar Empréstimo de Equipamento
      </h1>

      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <Input
            placeholder="Nome do Cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="border rounded-md px-2 py-1"
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
              disabled={loadingEquipments || isSubmitting}
            >
              <option value="">
                {loadingEquipments
                  ? "Carregando equipamentos..."
                  : "Selecionar Equipamento"}
              </option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>

            <Button
              onClick={handleAddItem}
              disabled={!selectedEquipmentId || isSubmitting}
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>

          {loanItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanItems.map((item, index) => (
                  <TableRow key={`${item.equipment_id}-${index}`}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar Empréstimo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}