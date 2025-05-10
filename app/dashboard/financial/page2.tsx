"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Check } from "lucide-react"
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
import { Pencil, Trash, Funnel } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Invoice {
  id: string;
  invoice_number?: string; 
  type?: "input" | "output";
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

function formatToBrazilianDate(iso: string | null | undefined) {
  if (!iso || !iso.includes("-")) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export default function FinancialPage() {
  const router = useRouter();
  const { companyId } = useAuthenticatedCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Invoice | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const [dueDateFilter, setDueDateFilter] = useState<"asc" | "desc" | "future" | null>(null);
  const [issueDateFilter, setIssueDateFilter] = useState<"asc" | "desc" | "future" | null>(null);
  const today = new Date().toISOString().split("T")[0]; 
  const [invoiceItems, setInvoiceItems] = useState<{ name: string; quantity: number; unit_price: number }[]>([]);

  useEffect(() => {
    if (!companyId) return;

    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("company_id", companyId);

      if (error) {
        console.error("Error fetching invoices:", error.message);
      } else {
        setInvoices(data || []);
      }
    };

    fetchInvoices();
  }, [companyId]);

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

  const normalize = (str: string) => str.toLowerCase().replace(/_/g, " ").trim();

  const filteredInvoices = invoices
    .filter((invoice) => {
      const term = search.toLowerCase().trim();
      return (
        invoice.description.toLowerCase().includes(term) ||
        invoice.supplier.toLowerCase().includes(term) ||
        normalize(invoice.category).includes(term) // <-- aqui apenas ajustamos para categoria funcionar sem _
      );
    })
    .filter((invoice) => {
      const isDueFuture = dueDateFilter === "future" && invoice.due_date;
      const isIssueFuture = issueDateFilter === "future" && invoice.issue_date;
  
      const dueDatePass = isDueFuture ? invoice.due_date! >= today : true;
      const issueDatePass = isIssueFuture ? invoice.issue_date >= today : true;
  
      return dueDatePass && issueDatePass;
    })
    .sort((a, b) => {
      let field: keyof Invoice | null = sortField;
  
      if (dueDateFilter && !sortField) field = "due_date";
      if (issueDateFilter && !sortField) field = "issue_date";
  
      if (!field) return 0;
  
      const aVal = a[field];
      const bVal = b[field];
  
      if (!aVal || !bVal) return 0;
  
      const dateFields = ["due_date", "issue_date"];
  
      if (dateFields.includes(field)) {
        return sortAsc
          ? new Date(aVal).getTime() - new Date(bVal).getTime()
          : new Date(bVal).getTime() - new Date(aVal).getTime();
      }
  
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      timeZone: "UTC",
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
  useEffect(() => {
    const fetchInvoiceItems = async () => {
      if (!selectedInvoice) return;
  
      if (selectedInvoice.category === "compra_produto") {
        const { data, error } = await supabase
          .from("financial_products")
          .select(`
            quantity,
            unit_price,
            products (
              name
            )
          `)
          .eq("note_id", selectedInvoice.id);
  
        if (error) {
          console.error("Erro ao buscar produtos:", error);
          return;
        }
  
        if (data) {
          setInvoiceItems(
            data.map((item: any) => ({
              name: item.products?.name ?? "Produto desconhecido",
              quantity: item.quantity,
              unit_price: item.unit_price,
            }))
          );
        }
      } else if (selectedInvoice.category === "compra_equipamento") {
        const { data, error } = await supabase
          .from("financial_equipments")
          .select(`
            quantity,
            unit_price,
            equipments (
              name
            )
          `)
          .eq("financial_record_id", selectedInvoice.id);
  
        if (error) {
          console.error("Erro ao buscar equipamentos:", error);
          return;
        }
  
        if (data) {
          setInvoiceItems(
            data.map((item: any) => ({
              name: item.equipments?.name ?? "Equipamento desconhecido",
              quantity: item.quantity,
              unit_price: item.unit_price,
            }))
          );
        }
      }
    };
  
    fetchInvoiceItems();
  }, [selectedInvoice]);

  const exportToPDF = () => {
    const doc = new jsPDF();
  
    doc.text("Notas Financeiras", 14, 15);
  
    const tableData = filteredInvoices.map((invoice) => [
      formatDate(invoice.due_date ?? ''),
      suppliers.find(s => s.id === invoice.supplier)?.name ?? invoice.supplier,
      invoice.description,
      normalize(invoice.category),
      invoice.payment_method,
      `R$ ${invoice.amount.toFixed(2).replace(".", ",")}`,
      invoice.status === "Paid" ? "Pago" : "Pendente",
    ]);
  
    autoTable(doc, {
      head: [["Vencimento", "Fornecedor", "Descrição", "Categoria", "Método", "Valor", "Status"]],
      body: tableData,
      startY: 25,
    });
  
    doc.save("notas-financeiras.pdf");
  };
  
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Financeiro</h2>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:flex-1">
          <Input
            type="text"
            placeholder="Search by description, supplier, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full p-2 border rounded-md"
          />
        </div>

        <div className="flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm"><Funnel />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {/* VENCIMENTO */}
          <DropdownMenuLabel>Por Vencimento</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setDueDateFilter(dueDateFilter === "asc" ? null : "asc")}>
              {dueDateFilter === "asc" && <Check className="mr-2 h-4 w-4" />}
              Mais Antigo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDueDateFilter(dueDateFilter === "desc" ? null : "desc")}>
              {dueDateFilter === "desc" && <Check className="mr-2 h-4 w-4" />}
              Mais Recente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDueDateFilter(dueDateFilter === "future" ? null : "future")}>
              {dueDateFilter === "future" && <Check className="mr-2 h-4 w-4" />}
              Futuros
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* EMISSÃO */}
          <DropdownMenuLabel>Por Emissão</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIssueDateFilter(issueDateFilter === "asc" ? null : "asc")}>
              {issueDateFilter === "asc" && <Check className="mr-2 h-4 w-4" />}
              Mais Antigo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIssueDateFilter(issueDateFilter === "desc" ? null : "desc")}>
              {issueDateFilter === "desc" && <Check className="mr-2 h-4 w-4" />}
              Mais Recente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIssueDateFilter(issueDateFilter === "future" ? null : "future")}>
              {issueDateFilter === "future" && <Check className="mr-2 h-4 w-4" />}
              Futuros
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

        <div className="w-full md:w-auto">
        <Link href="/dashboard/financial/add">
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px] w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span className="hidden sm:inline">Financeiro</span>
          </Button>
        </Link>
        </div>
      </div>



      <div className="p-4 rounded-lg shadow-md overflow-x-auto max-w-full">
      <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer w-[40px]" onClick={() => handleSort("due_date")}>Vencimento</TableHead>
              <TableHead className="cursor-pointer w-[90px] truncate" onClick={() => handleSort("supplier")}>Fornecedor</TableHead>
              <TableHead className="cursor-pointer w-[80px] truncate" onClick={() => handleSort("description")}>Descrição</TableHead>
              <TableHead className="cursor-pointer w-[60px]" onClick={() => handleSort("category")}>Categoria</TableHead>
              <TableHead className="cursor-pointer w-[40px]" onClick={() => handleSort("payment_method")}>Método</TableHead>
              <TableHead className="cursor-pointer w-[50px]" onClick={() => handleSort("amount")}>Valor</TableHead>
              <TableHead className="cursor-pointer w-[80px]" onClick={() => handleSort("status")}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setIsModalOpen(true);
                  }}
                  className="cursor-pointer h-[50px]"
                >
                  <TableCell className="whitespace-nowrap">
                    {formatDate(invoice.due_date ?? '')}
                    </TableCell>
                  <TableCell className="truncate whitespace-nowrap">
                    {suppliers.find(s => s.id === invoice.supplier)?.name ?? invoice.supplier}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap">{invoice.description}

                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {invoice.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {invoice.payment_method}
                    </TableCell>
                  <TableCell className="whitespace-nowrap">
                    R$ {invoice.amount.toFixed(2).replace(".", ",")}
                    </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {invoice.status === "Unpaid" ? (
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        markAsPaid(invoice.id);
                      }}>
                        Marcar como Pago
                      </Button>
                    ) : (
                      <span className="text-green-600 font-medium">Pago</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma nota encontrada...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInvoice && (
        <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Detalhes da Nota: {selectedInvoice.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Tipo de Nota:</strong> {selectedInvoice.type === "input" ? "Nota de Entrada" : "Nota de Saída"}</p>
              <p><strong>Categoria:</strong> {selectedInvoice.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Data de Emissão:</strong> {formatDate(selectedInvoice.issue_date ?? '')}</p>
              <p><strong>Data Vencimento:</strong> {formatDate(selectedInvoice.due_date ?? '')}</p>
              <p><strong>Fornecedor:</strong> {suppliers.find(s => s.id === selectedInvoice.supplier)?.name ?? selectedInvoice.supplier}</p>
              <p><strong>Descrição:</strong> {selectedInvoice.description}</p>
              <p><strong>Notas:</strong> {selectedInvoice.notes}</p>
              <p><strong>Método de Pagamento:</strong> {selectedInvoice.payment_method}</p>
              {invoiceItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">
                    {selectedInvoice?.category === "compra_produto" ? "Produtos" : "Equipamentos"}
                  </h4>
                  <ul className="space-y-1">
                    {invoiceItems.map((item, index) => (
                      <li key={index} className="text-sm">
                        {item.quantity}x {item.name} - R$ {item.unit_price.toFixed(2).replace(".", ",")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p><strong>Valor:</strong> R$ {selectedInvoice.amount.toFixed(2).replace(".", ",")}</p>
              <p><strong>Status:</strong> {selectedInvoice.status === "Unpaid" ? (
                <Button variant="outline" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  markAsPaid(selectedInvoice.id);
                }}>
                  Marcar como Pago
                </Button>
              ) : (
                <span className="text-green-600 font-medium">Pago</span>
              )}</p>
            </div>
            <DialogFooter className="flex justify-between">

              <Button onClick={() => router.push(`/dashboard/financial/${selectedInvoice.id}/edit`)}>
                <Pencil className="h-4 w-4" /> Editar Nota
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await handleDelete(selectedInvoice.id);
                  setIsModalOpen(false);
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="flex justify-end mt-4">
      <Button onClick={exportToPDF} variant="outline" size="sm" className="ml-2">
        Exportar PDF
      </Button>
      </div>
    </div>
  );
}
