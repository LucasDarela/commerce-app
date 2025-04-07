"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  name: string;
  agency_name: string;
  account: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AddFinancialRecord() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newBank, setNewBank] = useState({ bank: "", agency_name: "", account: "" });

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentDays, setPaymentDays] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [recurring, setRecurring] = useState<boolean>(false);
  const [recurrenceType, setRecurrenceType] = useState("");
  const [notes, setNotes] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!amount || !description || !paymentMethod) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const record = {
      company_id: companyId,
      issue_date: issueDate || new Date().toISOString().split("T")[0],
      due_date: dueDate,
      invoice_number: invoiceNumber,
      supplier: selectedSupplier,
      description,
      category: selectedCategory || customCategory || "others",
      amount,
      notes,
      status: "Unpaid",
      created_at: new Date().toISOString(),
      bank_account_id: selectedAccount || null, // ✅ se você criou a coluna
    };

    const { error } = await supabase.from("financial_records").insert([record]);

    if (error) {
      toast.error("Failed to create record: " + error.message);
    } else {
      toast.success("Financial record created successfully!");
      router.push("/dashboard/financial");
    }
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name");
      if (!error) setSuppliers(data || []);
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!companyId) return;
  
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, agency_name, account")
        .eq("company_id", companyId); // <-- filtro por empresa
  
      if (!error) {
        setBankAccounts(data || []);
      } else {
        console.error("Error loading bank accounts:", error.message);
      }
    };
  
    fetchBankAccounts();
  }, [companyId]); // <-- importante: disparar quando o companyId estiver disponível

  useEffect(() => {
    const fetchCompanyId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) return;
  
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
  
      if (!error && data) {
        setCompanyId(data.company_id);
      } else {
        console.error("Failed to load company ID:", error?.message);
      }
    };
  
    fetchCompanyId();
  }, []);

  const formatDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8); // remove tudo que não for número
    const parts = [];
  
    if (cleaned.length > 2) {
      parts.push(cleaned.slice(0, 2));
      if (cleaned.length > 4) {
        parts.push(cleaned.slice(2, 4));
        parts.push(cleaned.slice(4));
      } else {
        parts.push(cleaned.slice(2));
      }
    } else {
      parts.push(cleaned);
    }
  
    return parts.join("/");
  };

  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    // Simula uma chamada assíncrona
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold mb-4">Adicionar um Nota Financeira</h1>

  {/* Banco */}
  <div className="w-full">
    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione uma conta bancária" />
      </SelectTrigger>
      <SelectContent>
        {bankAccounts.map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            {acc.name} - {acc.agency_name}/{acc.account}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Datas + Número da nota */}
  <div className="grid grid-cols-3 gap-4 mt-4">
    <Input placeholder="Data de Emissão" value={issueDate} onChange={(e) => setIssueDate(formatDate(e.target.value))} />
    <Input placeholder="Data de Vencimento" value={dueDate} onChange={(e) => setDueDate(formatDate(e.target.value))} />
    <Input placeholder="Numero da Nota (opcional)" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
  </div>

  {/* Categoria + Fornecedor */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione a categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="product_purchase">Compra de Produto</SelectItem>
        <SelectItem value="employee_payment">Pagamento Funcionário</SelectItem>
        <SelectItem value="employee_advance">Vale Funcionário</SelectItem>
        <SelectItem value="utilities">Utilidades</SelectItem>
        <SelectItem value="rent">Aluguel</SelectItem>
        <SelectItem value="vehicle_expenses">Gastos com Veículos</SelectItem>
        <SelectItem value="others">+ Personalizado</SelectItem>
      </SelectContent>
    </Select>

    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um Fornecedor" />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>
            {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {selectedCategory === "others" && (
    <Input
      placeholder="Digite uma Categoria Pesonalizada"
      value={customCategory}
      onChange={(e) => setCustomCategory(e.target.value)}
      className="mt-4"
    />
  )}

  {/* Pagamento + Valor */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Método de pagamento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cash">Dinheiro</SelectItem>
        <SelectItem value="pix">Pix</SelectItem>
        <SelectItem value="card">Cartão</SelectItem>
        <SelectItem value="boleto">Boleto</SelectItem>
      </SelectContent>
    </Select>

    <Input
      placeholder="Valor"
      type="number"
      value={amount}
      onChange={(e) => setAmount(Number(e.target.value) || "")}
    />
  </div>

  {/* Parcelamento se boleto */}
  {paymentMethod === "boleto" && (
    <Input
      className="mt-4"
      type="number"
      placeholder="Days to pay"
      value={paymentDays}
      onChange={(e) => setPaymentDays(Number(e.target.value) || "")}
    />
  )}

  {/* Descrição */}
  <Input
    placeholder="Descrição"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-4"
  />

  {/* Notas */}
  <textarea
    placeholder="Notas (opcional)"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
  ></textarea>

  {/* Botão */}
  <Button className="mt-4 w-full" onClick={handleSubmit} disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? "Salvando..." : "Salvar Nota"}
  </Button>
</div>
  );
}
