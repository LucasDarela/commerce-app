"use client";

import { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";

export default function LoanEquipmentComponent() {
  const { companyId } = useAuthenticatedCompany();
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [loanItems, setLoanItems] = useState<any[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");

  const fetchEquipments = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("equipments")
      .select("id, name")
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao buscar equipamentos");
    } else {
      setEquipmentList(data || []);
    }
  };

  const handleAddItem = () => {
    if (!selectedEquipmentId) return;
    const equipment = equipmentList.find((e) => e.id === selectedEquipmentId);
    if (equipment) {
      setLoanItems([
        ...loanItems,
        { equipment_id: equipment.id, name: equipment.name },
      ]);
      setSelectedEquipmentId("");
    }
  };

  const handleRemoveItem = (index: number) => {
    setLoanItems(loanItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!companyId || !customerName || loanItems.length === 0) {
      toast.error("Preencha todos os campos");
      return;
    }

    const { data, error } = await supabase.from("equipment_loans").insert([
      {
        company_id: companyId,
        customer_name: customerName,
        items: loanItems,
      },
    ]);

    if (error) {
      toast.error("Erro ao salvar empréstimo");
    } else {
      toast.success("Empréstimo registrado com sucesso");
      setCustomerName("");
      setLoanItems([]);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [companyId]);

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
            >
              <option value="">Selecionar Equipamento</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
            <Button onClick={handleAddItem}>
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
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button onClick={handleSubmit} className="w-full mt-4">
            Salvar Empréstimo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
