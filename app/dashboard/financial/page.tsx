"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

interface Invoice {
  id: string;
  issue_date: string;
  due_date?: string;
  supplier: string;
  description: string;
  category: string;
  amount: number;
  status: "Paid" | "Unpaid";
  payment_method: string;
  notes?: string;
}

export default function FinancialPage() {
  const router = useRouter();
  const { companyId } = useAuthenticatedCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error.message);
      } else {
        setInvoices(data || []);
      }
    };

    fetchInvoices();
  }, [companyId]);

  const filteredInvoices = invoices.filter((invoice) => {
    const term = search.toLowerCase();
    return (
      invoice.description.toLowerCase().includes(term) ||
      invoice.supplier.toLowerCase().includes(term) ||
      invoice.category.toLowerCase().includes(term)
    );
  });

  const openModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedInvoice(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      const { error } = await supabase
        .from("financial_records")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete invoice: " + error.message);
      } else {
        toast.success("Invoice deleted successfully!");
        setInvoices(invoices.filter((inv) => inv.id !== id));
      }
    }
  };

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

useEffect(() => {
  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name");

    if (error) {
      console.error("Error fetching suppliers:", error.message);
    } else {
      setSuppliers(data || []);
    }
  };

  if (companyId) fetchSuppliers();
}, [companyId]);

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
};

const formatCategory = (category: string) => {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const markAsPaid = async (id: string) => {
  const { error } = await supabase
    .from("financial_records")
    .update({ status: "Paid" })
    .eq("id", id);

  if (error) {
    toast.error("Failed to update status");
  } else {
    toast.success("Marked as Paid");
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "Paid" } : inv))
    );
  }
};

  return (
    <div className="p-8">
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Search by description, supplier, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/financial/add")}
          className="w-full sm:w-auto"
        >
          Add Invoice
        </Button>
      </div>

      <div className="p-4 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Duo Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  onClick={() => openModal(invoice)}
                  className="cursor-pointer hover:bg-gray-100"
                >
              <TableCell>{formatDate(invoice.due_date ?? '')}</TableCell>     
              <TableCell>
                {suppliers.find(s => s.id === invoice.supplier)?.name ?? invoice.supplier}
              </TableCell>
              <TableCell>{invoice.description}</TableCell>
              <TableCell>
                {invoice.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </TableCell>
              <TableCell>{invoice.payment_method}</TableCell>
              <TableCell>R$ {invoice.amount.toFixed(2).replace(".", ",")}</TableCell>
              <TableCell>
                {invoice.status === "Unpaid" ? (
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    markAsPaid(invoice.id);
                  }}>
                    Mark as Paid
                  </Button>
                ) : (
                  <span className="text-green-600 font-medium">Paid</span>
                )}
              </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInvoice && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Duo Date:</strong> {formatDate(selectedInvoice.due_date ?? '')}</p>
              <p><strong>Supplier:</strong> {suppliers.find(s => s.id === selectedInvoice.supplier)?.name ?? selectedInvoice.supplier}</p>
              <p><strong>Description:</strong> {selectedInvoice.description}</p>
              <p><strong>Notes:</strong> {selectedInvoice.notes}</p>
              <p><strong>Category:</strong> {selectedInvoice.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Payment Method:</strong> {selectedInvoice.payment_method}</p>
              <p><strong>Amount:</strong> R$ {selectedInvoice.amount.toFixed(2).replace(".", ",")}</p>
              <p><strong>Status:</strong>   {selectedInvoice.status === "Unpaid" ? (
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    markAsPaid(selectedInvoice.id);
                  }}>
                    Mark as Paid
                  </Button>
                ) : (
                  <span className="text-green-600 font-medium">Paid</span>
                )}</p>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedInvoice.id)}
              >
                <Trash className="h-4 w-4" /> Delete
              </Button>
              <Button
                onClick={() =>
                  router.push(`/dashboard/financial/${selectedInvoice.id}/edit`)
                }
              >
                <Pencil className="h-4 w-4" /> Edit Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}