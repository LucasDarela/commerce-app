"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type CustomerOption = {
  id: string;
  name: string;
};

type EquipmentOption = {
  id: string;
  name: string;
};

type LoanItem = {
  equipment_id: string;
  name: string;
  quantity: number;
};

type LoanEquipmentModalProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onLoanSaved: () => void;
  initialCustomer?: { id: string; name: string };
  initialItems?: { equipment_id: string; name: string; quantity: number }[];
};

export function LoanEquipmentModal({
  open,
  onOpenChange,
  onLoanSaved,
  initialCustomer,
  initialItems,
}: LoanEquipmentModalProps) {
  const { companyId } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [searchEquipment, setSearchEquipment] = useState("");
  const [showEquipments, setShowEquipments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [noteDate, setNoteDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [noteNumber, setNoteNumber] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);

  const resetLocalState = useCallback(() => {
    setSearchCustomer("");
    setShowCustomers(false);
    setLoanItems([]);
    setSelectedEquipmentId("");
    setSearchEquipment("");
    setShowEquipments(false);
    setSelectedCustomer(null);
    setNoteDate(new Date().toISOString().split("T")[0]);
    setNoteNumber("");
  }, []);

  // Gera o próximo número de nota a ser usado.
  // NÃO garante unicidade por si só — a garantia vem do INSERT na lock table.
  const generateCandidateNoteNumber = useCallback(async (): Promise<string> => {
    if (!companyId) return "";

    const { data, error } = await supabase
      .from("equipment_loans")
      .select("note_number")
      .eq("company_id", companyId)
      .not("note_number", "is", null)
      .neq("note_number", "");

    if (error) {
      console.error("Erro ao buscar último número de nota:", error);
      // Fallback: timestamp para garantir unicidade mínima
      return "E" + String(Date.now()).slice(-6);
    }

    const maxFromLoans = (data || []).reduce((max, record) => {
      const parsed = parseInt(
        (record.note_number ?? "").replace(/\D/g, ""),
        10,
      );
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);

    // Consulta também a tabela de lock para pegar o maior já reservado
    const { data: lockData } = await supabase
      .from("equipment_loan_note_locks")
      .select("note_number")
      .eq("company_id", companyId);

    const maxFromLocks = (lockData || []).reduce((max, record) => {
      const parsed = parseInt(
        (record.note_number ?? "").replace(/\D/g, ""),
        10,
      );
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);

    const next = Math.max(maxFromLoans, maxFromLocks) + 1;
    return "E" + next.toString().padStart(4, "0");
  }, [companyId, supabase]);

  const fetchBaseData = useCallback(async () => {
    if (!companyId) return;

    setIsLoadingData(true);

    const [equipmentsRes, customersRes] = await Promise.all([
      supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true }),
      supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true }),
    ]);

    if (equipmentsRes.error) {
      console.error("Erro ao buscar equipamentos:", equipmentsRes.error);
      toast.error("Erro ao buscar equipamentos");
    } else {
      setEquipmentList((equipmentsRes.data as EquipmentOption[]) || []);
    }

    if (customersRes.error) {
      console.error("Erro ao carregar clientes:", customersRes.error);
      toast.error("Erro ao carregar clientes.");
    } else {
      setCustomers((customersRes.data as CustomerOption[]) || []);
    }

    // Número da nota é gerado apenas no momento do INSERT — não pré-gerado aqui.
    setNoteNumber("");
    setIsLoadingData(false);
  }, [companyId, supabase]);

  const handleAddItem = () => {
    if (!selectedEquipmentId) return;

    const equipment = equipmentList.find((e) => e.id === selectedEquipmentId);
    if (!equipment) return;

    setLoanItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.equipment_id === equipment.id,
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [
        ...prev,
        { equipment_id: equipment.id, name: equipment.name, quantity: 1 },
      ];
    });

    setSelectedEquipmentId("");
    setSearchEquipment("");
  };

  const handleRemoveItem = (index: number) => {
    setLoanItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setSearchCustomer(customer.name);
    setShowCustomers(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!companyId || !selectedCustomer || loanItems.length === 0) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Salvando empréstimo...");

    // Agrupa itens por equipamento antes do loop de retry
    const grouped = new Map<string, LoanItem>();
    for (const item of loanItems) {
      const key = item.equipment_id;
      if (grouped.has(key)) {
        grouped.get(key)!.quantity += item.quantity;
      } else {
        grouped.set(key, { ...item });
      }
    }

    const MAX_RETRIES = 5;
    let reservedNoteNumber: string | null = null;

    try {
      // ── ETAPA 1: reservar o número na lock table (atomicamente) ──
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const candidate = await generateCandidateNoteNumber();

        if (!candidate) {
          toast.dismiss(loadingToast);
          toast.error("Não foi possível gerar o número da nota.");
          return;
        }

        const { error: lockError } = await supabase
          .from("equipment_loan_note_locks")
          .insert({ company_id: companyId, note_number: candidate });

        if (!lockError) {
          // Reserva bem-sucedida — número único garantido pelo PK da lock table
          reservedNoteNumber = candidate;
          break;
        }

        // Código 23505 = unique_violation: outro processo reservou este número
        const isConflict =
          lockError.code === "23505" ||
          lockError.message?.toLowerCase().includes("unique") ||
          lockError.message?.toLowerCase().includes("duplicate");

        if (isConflict && attempt < MAX_RETRIES) {
          console.warn(
            `Nota ${candidate} já reservada — tentativa ${attempt}/${MAX_RETRIES}. Regenerando...`,
          );
          await new Promise((r) => setTimeout(r, 50 * attempt));
          continue;
        }

        // Esgotou tentativas ou erro desconhecido
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

      // ── ETAPA 2: inserir os itens do empréstimo com o número reservado ──
      const inserts = Array.from(grouped.values()).map((item) => ({
        company_id: companyId,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        equipment_id: item.equipment_id,
        loan_date: noteDate,
        note_number: reservedNoteNumber,
        note_date: noteDate,
        quantity: item.quantity,
        status: "active",
      }));

      const { error: insertError } = await supabase
        .from("equipment_loans")
        .insert(inserts);

      // Sempre libera o lock, independentemente de sucesso ou erro, pois o número já
      // foi salvo na tabela principal ou a transação falhou.
      await supabase
        .from("equipment_loan_note_locks")
        .delete()
        .eq("company_id", companyId)
        .eq("note_number", reservedNoteNumber);

      if (insertError) {
        console.error("Erro ao salvar empréstimo:", insertError);
        toast.dismiss(loadingToast);
        toast.error("Erro ao salvar empréstimo.");
        return;
      }

      setNoteNumber(reservedNoteNumber);
      toast.dismiss(loadingToast);
      toast.success("Empréstimo registrado com sucesso");
      resetLocalState();
      onLoanSaved?.();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEquipments = searchEquipment.trim()
    ? equipmentList.filter((eq) =>
        eq.name.toLowerCase().includes(searchEquipment.toLowerCase()),
      )
    : [];

  useEffect(() => {
    if (!open || !companyId) return;

    const prepareModal = async () => {
      await fetchBaseData();

      setLoanItems([]);
      setSelectedEquipmentId("");
      setSearchEquipment("");
      setShowEquipments(false);

      if (initialCustomer) {
        setSelectedCustomer(initialCustomer);
        setSearchCustomer(initialCustomer.name);
      } else {
        setSelectedCustomer(null);
        setSearchCustomer("");
      }

      if (initialItems?.length) {
        setLoanItems(initialItems);
      }
    };

    prepareModal();
  }, [open, companyId, initialCustomer, initialItems, fetchBaseData]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) resetLocalState();
      }}
    >
      <DialogContent
        key={`${open}-${initialItems?.length ?? 0}`}
        className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-lg p-4"
      >
        <DialogHeader>
          <DialogTitle className="mt-2 font-bold text-xl">
            Registre o Empréstimo de Equipamento
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para registrar o empréstimo de equipamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="Gerado automaticamente ao salvar"
                className="bg-muted cursor-not-allowed text-muted-foreground"
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
            />

            {showCustomers && searchCustomer.trim() && (
              <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md max-h-40 overflow-y-auto bg-gray-100">
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
              Cliente selecionado:{" "}
              <strong>{selectedCustomer?.name || "Nenhum"}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Digite o nome do equipamento"
                value={searchEquipment}
                onChange={(e) => {
                  setSearchEquipment(e.target.value);
                  setShowEquipments(true);
                }}
                onBlur={() => setTimeout(() => setShowEquipments(false), 200)}
              />

              {showEquipments && filteredEquipments.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border rounded-md shadow-md bg-gray-100 max-h-40 overflow-y-auto">
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

            <Button
              onClick={handleAddItem}
              className="self-start"
              disabled={isSubmitting || isLoadingData}
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Adicionar
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
                          const newQuantity = parseInt(e.target.value, 10) || 1;
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
            disabled={isSubmitting || isLoadingData}
          >
            {isSubmitting ? "Salvando..." : "Salvar Empréstimo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}