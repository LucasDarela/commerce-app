"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  name: string;
  agency: string;
  account: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AddFinancialRecord() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newBank, setNewBank] = useState({ bank: "", agency: "", account: "" });

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentDays, setPaymentDays] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [recurring, setRecurring] = useState<boolean>(false);
  const [recurrenceType, setRecurrenceType] = useState("");
  const [notes, setNotes] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!amount || !description || !paymentMethod) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const record = {
      company_id: companyId,
      issue_date: issueDate || new Date().toISOString().split("T")[0],
      due_date: dueDate,
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

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Add Financial Record</h1>

      <div className="grid grid-cols-3 gap-4">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger>
            <SelectValue placeholder="Select bank account" />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name} - {acc.agency}/{acc.account}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <Input placeholder="Issue Date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        <Input placeholder="Due Date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input placeholder="Invoice Number (optional)" />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product_purchase">Product Purchase</SelectItem>
            <SelectItem value="employee_payment">Employee Payment</SelectItem>
            <SelectItem value="employee_advance">Employee Advance</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="vehicle_expenses">Vehicle Expenses</SelectItem>
            <SelectItem value="others">+ Custom</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger>
            <SelectValue placeholder="Select supplier" />
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
          placeholder="Enter custom category"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          className="mt-4"
        />
      )}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
          </SelectContent>
        </Select>

        {paymentMethod === "boleto" && (
          <Input
            type="number"
            placeholder="Days to pay"
            value={paymentDays}
            onChange={(e) => setPaymentDays(Number(e.target.value) || "")}
          />
        )}
      </div>

      <Input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value) || "")}
        className="mt-4"
      />
      <Input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-4"
      />

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
      ></textarea>

      <Button className="mt-4 w-full" onClick={handleSubmit}>
        Save Financial Record
      </Button>

      {/* Modal for adding new bank account */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <Input placeholder="Bank Name" value={newBank.bank} onChange={(e) => setNewBank({ ...newBank, bank: e.target.value })} />
          <Input placeholder="Agency" value={newBank.agency} onChange={(e) => setNewBank({ ...newBank, agency: e.target.value })} />
          <Input placeholder="Account Number" value={newBank.account} onChange={(e) => setNewBank({ ...newBank, account: e.target.value })} />
          <DialogFooter>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
