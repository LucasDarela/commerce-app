"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

// 🔹 Supplier Type
type Supplier = {
  id: string;
  name: string;
  type: string;
  document: string;
  phone: string;
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  number?: string;
  complement?: string;
  email?: string;
  state_registration?: string;
  fantasy_name?: string;
  company_id: string;
};

export default function ListSuppliers() {
  const router = useRouter();
  const { user, companyId, loading } = useAuthenticatedCompany();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        if (!companyId) return;
  
        let query = supabase
          .from("suppliers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true });
  
          if (search.trim()) {
            const raw = search.trim();
            const cleaned = raw.replace(/\D/g, "");
          
            const filters = [];
          
            if (raw) {
              filters.push(`name.ilike.%${raw}%`);
            }
          
            if (cleaned) {
              filters.push(`document.ilike.%${cleaned}%`);
              filters.push(`phone.ilike.%${cleaned}%`);
            }
          
            if (filters.length > 0) {
              query = query.or(filters.join(","));
            }
          }
  
        const { data, error } = await query;
  
        if (error) {
          console.error("❌ Erro ao buscar fornecedores:", error.message);
          toast.error("Erro ao carregar fornecedores.");
        } else {
          setSuppliers(data ?? []);
        }
      } catch (error) {
        console.error("❌ Erro inesperado:", error);
        toast.error("Erro inesperado ao carregar fornecedores.");
      }
    };
  
    if (!loading && companyId) {
      fetchSuppliers();
    }
  }, [companyId, loading, search]);

  const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  const openModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedSupplier(null);
    setIsModalOpen(false);
  };

  const handleEdit = () => {
    if (selectedSupplier) {
      router.push(`/dashboard/suppliers/${selectedSupplier.id}/edit`);
      closeModal();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete supplier: " + error.message);
      } else {
        toast.success("Supplier deleted successfully!");
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
      }
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Fornecedores</h2>
      <div className="mb-6 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Search by name, document or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />
        <Link href="/dashboard/suppliers/add">
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px] w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span className="hidden sm:inline">Fornecedor</span>
          </Button>
        </Link>
      </div>

      <div className="p-4 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Documento</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Cidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} onClick={() => openModal(supplier)} className="cursor-pointer h-[50px]">
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{supplier.type}</TableCell>
                  <TableCell className="hidden md:table-cell">{supplier.document}</TableCell>
                  <TableCell className="hidden md:table-cell">{supplier.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{supplier.city}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedSupplier && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Detalhes do Fornecedor</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Nome:</strong> {selectedSupplier.name}</p>
              {selectedSupplier.fantasy_name && <p><strong>Nome Fantasia:</strong> {selectedSupplier.fantasy_name}</p>}
              <p><strong>Tipo:</strong> {selectedSupplier.type}</p>
              <p><strong>Documento:</strong> {selectedSupplier.document}</p>
              <p><strong>Telefone:</strong> {selectedSupplier.phone}</p>
              <p><strong>CEP:</strong> {selectedSupplier.zip_code}</p>
              <p><strong>Endereço:</strong> {[
                selectedSupplier.address,
                selectedSupplier.neighborhood,
                selectedSupplier.number
              ].filter(Boolean).join(", ")}</p>
              {selectedSupplier.complement && <p><strong>Complemento:</strong> {selectedSupplier.complement}</p>}
              <p><strong>Cidade:</strong> {selectedSupplier.city}</p>
              <p><strong>Estado:</strong> {selectedSupplier.state}</p>
              <p><strong>Email:</strong> {selectedSupplier.email || ""}</p>
              {selectedSupplier.state_registration && <p><strong>Inscrição Estadual:</strong> {selectedSupplier.state_registration}</p>}
            </div>
            <DialogFooter className="flex justify-between">
            <Button onClick={handleEdit}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedSupplier.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}