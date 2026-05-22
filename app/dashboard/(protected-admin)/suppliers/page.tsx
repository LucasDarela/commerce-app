"use client";

import { useState, useEffect, useMemo } from "react";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { Pencil, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

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
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (loading || !companyId) return;

    let isMounted = true;

    const fetchSuppliers = async () => {
      try {
        const query = supabase
          .from("suppliers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        const { data, error } = await query;

        if (error) {
          console.error("Erro ao buscar fornecedores:", error.message);
          toast.error("Erro ao carregar fornecedores.");
          return;
        }

        if (isMounted) {
          setAllSuppliers((data as Supplier[]) ?? []);
        }
      } catch (error) {
        console.error("Erro inesperado:", error);
        toast.error("Erro inesperado ao carregar fornecedores.");
      }
    };

    fetchSuppliers();

    return () => {
      isMounted = false;
    };
  }, [companyId, loading, supabase]);

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\n/g, "")
      .trim();
  };

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return allSuppliers;
    const searchNormalized = normalizeText(search);
    const numericSearch = search.replace(/\D/g, "");

    return allSuppliers.filter(s => {
      const name = normalizeText(s.name || "");
      const fantasy = normalizeText(s.fantasy_name || "");
      const doc = s.document || "";
      const phone = s.phone || "";

      return name.includes(searchNormalized) || 
             fantasy.includes(searchNormalized) || 
             (numericSearch && (doc.includes(numericSearch) || phone.includes(numericSearch)));
    });
  }, [allSuppliers, search]);

  const openModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedSupplier(null);
    setIsModalOpen(false);
  };

  const handleEdit = () => {
    if (!selectedSupplier) return;
    router.push(`/dashboard/suppliers/${selectedSupplier.id}/edit`);
    closeModal();
  };

  const handleDelete = async () => {
    if (!companyId || !selectedSupplier) {
      toast.error("Empresa ou fornecedor não identificado.");
      return;
    }
    
    const id = selectedSupplier.id;

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Failed to delete supplier: " + error.message);
      return;
    }

    toast.success("Fornecedor removido com sucesso!");
    setAllSuppliers((prev) => prev.filter((s) => s.id !== id));

    setIsDeleteDialogOpen(false);
    closeModal();
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="p-6 mt-3">
      <h2 className="text-xl font-bold mb-4">Fornecedores</h2>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch">
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
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  onClick={() => openModal(supplier)}
                  className="cursor-pointer h-[50px]"
                >
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.document}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.phone}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.city}
                  </TableCell>
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
                <DialogDescription>
                  Informações detalhadas do fornecedor selecionado.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p>
                <strong>Nome:</strong> {selectedSupplier.name}
              </p>

              {selectedSupplier.fantasy_name && (
                <p>
                  <strong>Nome Fantasia:</strong>{" "}
                  {selectedSupplier.fantasy_name}
                </p>
              )}

              <p>
                <strong>Tipo:</strong> {selectedSupplier.type}
              </p>
              <p>
                <strong>Documento:</strong> {selectedSupplier.document}
              </p>
              <p>
                <strong>Telefone:</strong> {selectedSupplier.phone}
              </p>
              <p>
                <strong>CEP:</strong> {selectedSupplier.zip_code}
              </p>
              <p>
                <strong>Endereço:</strong>{" "}
                {[
                  selectedSupplier.address,
                  selectedSupplier.neighborhood,
                  selectedSupplier.number,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              {selectedSupplier.complement && (
                <p>
                  <strong>Complemento:</strong> {selectedSupplier.complement}
                </p>
              )}

              <p>
                <strong>Cidade:</strong> {selectedSupplier.city}
              </p>
              <p>
                <strong>Estado:</strong> {selectedSupplier.state}
              </p>
              <p>
                <strong>Email:</strong> {selectedSupplier.email || ""}
              </p>

              {selectedSupplier.state_registration && (
                <p>
                  <strong>Inscrição Estadual:</strong>{" "}
                  {selectedSupplier.state_registration}
                </p>
              )}
            </div>

            <DialogFooter className="w-full">
              <div className="grid grid-cols-4 gap-4 w-full">
                <Button onClick={handleEdit} className="col-span-3">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="col-span-1"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Fornecedor?</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir o fornecedor <strong>{selectedSupplier?.name}</strong>.
              <br /><br />
              Esta ação é definitiva e não poderá ser desfeita. Tem certeza que deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}