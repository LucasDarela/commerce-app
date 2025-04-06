"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function EditFinancialRecord() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

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
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    const loadInvoice = async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();

      if (error || !data) {
        toast.error("Failed to load record");
        return;
      }

      setSelectedAccount(data.bank_account_id || "");
      setSelectedCategory(data.category || "");
      setSelectedSupplier(data.supplier || "");
      setAmount(data.amount || "");
      setDescription(data.description || "");
      setDueDate(data.due_date || "");
      setIssueDate(data.issue_date || "");
      setNotes(data.notes || "");
      setPaymentMethod(data.payment_method || "pix");
    };

    loadInvoice();
  }, [invoiceId]);

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
      }
    };

    fetchCompanyId();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const [{ data: accounts }, { data: suppliersData }] = await Promise.all([
        supabase
          .from("bank_accounts")
          .select("id, name, agency_name, account")
          .eq("company_id", companyId),
        supabase.from("suppliers").select("id, name"),
      ]);

      setBankAccounts(accounts || []);
      setSuppliers(suppliersData || []);
    };

    fetchData();
  }, [companyId]);

  const handleUpdate = async () => {
    if (!amount || !description || !paymentMethod) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const { error } = await supabase
      .from("financial_records")
      .update({
        bank_account_id: selectedAccount,
        supplier: selectedSupplier,
        description,
        category: selectedCategory || customCategory || "others",
        payment_method: paymentMethod,
        issue_date: issueDate,
        due_date: dueDate,
        amount,
        notes,
      })
      .eq("id", invoiceId);

    if (error) {
      toast.error("Failed to update record: " + error.message);
    } else {
      toast.success("Record updated successfully!");
    }
  };

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

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold mb-4">Edit Financial Record</h1>

  {/* Bank account */}
  <div className="w-full">
    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select bank account" />
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

  {/* Dates and invoice number */}
  <div className="grid grid-cols-3 gap-4 mt-4">
    <Input placeholder="Issue Date" value={issueDate} onChange={(e) => setIssueDate(formatDate(e.target.value))} />
    <Input placeholder="Due Date" value={dueDate} onChange={(e) => setDueDate(formatDate(e.target.value))} />
    <Input placeholder="Invoice Number (optional)" />
  </div>

  {/* Category and Supplier */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
      <SelectTrigger className="w-full">
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
      <SelectTrigger className="w-full">
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

  {/* Custom category if 'others' */}
  {selectedCategory === "others" && (
    <Input
      placeholder="Enter custom category"
      value={customCategory}
      onChange={(e) => setCustomCategory(e.target.value)}
      className="mt-4"
    />
  )}

  {/* Payment Method and Amount */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Payment method" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cash">Cash</SelectItem>
        <SelectItem value="pix">Pix</SelectItem>
        <SelectItem value="card">Card</SelectItem>
        <SelectItem value="boleto">Boleto</SelectItem>
      </SelectContent>
    </Select>

    <Input
      placeholder="Amount"
      type="number"
      value={amount}
      onChange={(e) => setAmount(Number(e.target.value) || "")}
    />
  </div>

  {/* Days to pay (if boleto) */}
  {paymentMethod === "boleto" && (
    <Input
      type="number"
      placeholder="Days to pay"
      value={paymentDays}
      onChange={(e) => setPaymentDays(Number(e.target.value) || "")}
      className="mt-4"
    />
  )}

  {/* Description */}
  <Input
    placeholder="Description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-4"
  />

  {/* Notes */}
  <textarea
    placeholder="Notes (optional)"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="mt-4 w-full h-32 p-2 border rounded-md resize-none"
  ></textarea>

  {/* Submit button */}
  <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700" onClick={handleUpdate}>
    Update Record
  </Button>
</div>
  );
}