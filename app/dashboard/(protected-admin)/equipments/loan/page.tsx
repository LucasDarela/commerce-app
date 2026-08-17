"use client";

import { useEffect, useMemo, useState } from "react";
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

type CustomerOption = {
  id: string;
  name: string;
};

type LoanItem = {
  equipment_id: string;
  name: string;
  quantity: number;
};

export default function LoanEquipmentPage() {
  const supabase = createBrowserSupabaseClient();       
  const { companyId } = useAuthenticatedCompany();

  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [searchEquipment, setSearchEquipment] = useState("");
  const [showEquipments, setShowEquipments] = useState(false);
  const [noteDate, setNoteDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  // Número será gerado e reservado atomicamente no momento do INSERT
  const [noteNumber, setNoteNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const filteredEquipments = useMemo(() => {
    if (!searchEquipment.trim()) return [];
    return equipmentList.filter((eq) =>
      eq.name.toLowerCase().includes(searchEquipment.toLowerCase()),
    );
  }, [equipmentList, searchEquipment]);

  useEffect(() => {
    async function fetchEquipments() {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao buscar equipamentos:", error);
        toast.error("Erro ao buscar equipamentos");
        return;
      }

      setEquipmentList(data ?? []);
    }

    fetchEquipments();
  }, [companyId]);

  useEffect(() => {
    async function fetchCustomers() {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast.error("Erro ao carregar clientes.");
        return;
      }

      setCustomers(data ?? []);
    }

    fetchCustomers();
  }, [companyId]);

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomerId(customer.id);
    setSearchCustomer(customer.name);
    setShowCustomers(false);
  };

  const handleAddItem = () => {
    if (!selectedEquipmentId) {
      toast.error("Selecione um equipamento.");
      return;
    }

    const equipment = equipmentList.find((e) => e.id === selectedEquipmentId);

    if (!equipment) {
      toast.error("Equipamento inválido.");
      return;
    }

    setLoanItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.equipment_id === equipment.id,
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [
        ...prev,
        {
          equipment_id: equipment.id,
          name: equipment.name,
          quantity: 1,
        },
      ];
    });

    setSelectedEquipmentId("");
    setSearchEquipment("");
    setShowEquipments(false);
  };

  const handleRemoveItem = (index: number) => {
    setLoanItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!selectedCustomerId || !selectedCustomer) {
      toast.error("Selecione um cliente.");
      return;
    }

    if (loanItems.length === 0) {
      toast.error("Adicione ao menos um equipamento.");
      return;
    }

    const invalidItem = loanItems.find((item) => item.quantity <= 0);
    if (invalidItem) {
      toast.error("Todas as quantidades devem ser maiores que zero.");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Salvando empréstimo...");

    const MAX_RETRIES = 5;
    let reservedNoteNumber: string | null = null;

    try {
      // ── ETAPA 1: Gerar e reservar número atomicamente na lock table ──
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Lê o maior número de ambas as tabelas
        const [loansRes, locksRes] = await Promise.all([
          supabase
            .from("equipment_loans")
            .select("note_number")
            .eq("company_id", companyId)
            .not("note_number", "is", null)
            .neq("note_number", ""),
          supabase
            .from("equipment_loan_note_locks")
            .select("note_number")
            .eq("company_id", companyId),
        ]);

        const maxFromLoans = (loansRes.data || []).reduce((max, r) => {
          const n = parseInt((r.note_number ?? "").replace(/\D/g, ""), 10);
          return Number.isFinite(n) && n > max ? n : max;
        }, 0);

        const maxFromLocks = (locksRes.data || []).reduce((max, r) => {
          const n = parseInt((r.note_number ?? "").replace(/\D/g, ""), 10);
          return Number.isFinite(n) && n > max ? n : max;
        }, 0);

        const candidate =
          "E" + (Math.max(maxFromLoans, maxFromLocks) + 1).toString().padStart(4, "0");

        const { error: lockError } = await supabase
          .from("equipment_loan_note_locks")
          .insert({ company_id: companyId, note_number: candidate });

        if (!lockError) {
          reservedNoteNumber = candidate;
          break;
        }

        const isConflict =
          lockError.code === "23505" ||
          lockError.message?.toLowerCase().includes("unique") ||
          lockError.message?.toLowerCase().includes("duplicate");

        if (isConflict && attempt < MAX_RETRIES) {
          console.warn(`Nota ${candidate} já reservada — tentativa ${attempt}/${MAX_RETRIES}.`);
          await new Promise((r) => setTimeout(r, 50 * attempt));
          continue;
        }

        console.error("Erro ao reservar número de nota:", lockError);
        toast.dismiss(loadingToast);
        toast.error("Não foi possível gerar um número único. Tente novamente.");
        return;
      }

      if (!reservedNoteNumber) {
        toast.dismiss(loadingToast);
        toast.error("Não foi possível reservar o número da nota.");
        return;
      }

      // ── ETAPA 2: Inserir os itens do empréstimo ──
      const payload = loanItems.map((item) => ({
        company_id: companyId,
        customer_id: selectedCustomerId,
        customer_name: selectedCustomer.name,
        equipment_id: item.equipment_id,
        quantity: item.quantity,
        note_date: noteDate,
        note_number: reservedNoteNumber,
        status: "active",
        loan_date: noteDate,
      }));

      const { error } = await supabase.from("equipment_loans").insert(payload);

      // Sempre libera o lock, independentemente de sucesso ou erro
      await supabase
        .from("equipment_loan_note_locks")
        .delete()
        .eq("company_id", companyId)
        .eq("note_number", reservedNoteNumber);

      if (error) {
        console.error("Erro ao salvar empréstimo:", error);
        toast.dismiss(loadingToast);
        toast.error("Erro ao salvar empréstimo");
        return;
      }

      toast.dismiss(loadingToast);
      toast.success("Empréstimo registrado com sucesso");
      setNoteNumber(reservedNoteNumber);
      setSelectedCustomerId("");
      setSearchCustomer("");
      setLoanItems([]);
      setSelectedEquipmentId("");
      setSearchEquipment("");
      setShowCustomers(false);
      setShowEquipments(false);
      setNoteDate(new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error("Erro inesperado ao salvar empréstimo:", err);
      toast.error("Erro inesperado ao salvar empréstimo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Registrar Empréstimo de Equipamento
      </h1>

      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">
                Data da Nota
              </label>
              <Input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">
                Número da Nota
              </label>
              <Input
                type="text"
                value={noteNumber}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm text-muted-foreground">
              Nome do Cliente
            </label>
            <Input
              placeholder="Buscar cliente..."
              value={searchCustomer}
              onChange={(e) => {
                setSearchCustomer(e.target.value);
                setShowCustomers(true);
              }}
              onFocus={() => setShowCustomers(true)}
            />

            {showCustomers && searchCustomer.trim() && (
              <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-white">
                {customers
                  .filter((customer) =>
                    customer.name
                      .toLowerCase()
                      .includes(searchCustomer.toLowerCase()),
                  )
                  .map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      {customer.name}
                    </div>
                  ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-2">
              Cliente selecionado: <strong>{selectedCustomer?.name || "Nenhum"}</strong>
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Digite o nome do equipamento"
                value={searchEquipment}
                onChange={(e) => {
                  setSearchEquipment(e.target.value);
                  setShowEquipments(true);
                }}
                onFocus={() => setShowEquipments(true)}
                onBlur={() => setTimeout(() => setShowEquipments(false), 200)}
              />

              {showEquipments && filteredEquipments.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md bg-white max-h-40 overflow-y-auto">
                  {filteredEquipments.map((equipment) => (
                    <div
                      key={equipment.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedEquipmentId(equipment.id);
                        setSearchEquipment(equipment.name);
                        setShowEquipments(false);
                      }}
                    >
                      {equipment.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleAddItem}>
              <PlusCircle className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {loanItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loanItems.map((item, index) => (
                  <TableRow key={`${item.equipment_id}-${index}`}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1,
                          );

                          setLoanItems((prev) => {
                            const updated = [...prev];
                            updated[index] = {
                              ...updated[index],
                              quantity: newQuantity,
                            };
                            return updated;
                          });
                        }}
                        className="w-20"
                      />
                    </TableCell>

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

          <Button onClick={handleSubmit} className="w-full mt-4" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Empréstimo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}