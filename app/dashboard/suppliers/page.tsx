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

        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (error) {
          console.error("❌ Error fetching suppliers:", error.message);
          toast.error("Failed to load suppliers.");
        } else {
          setSuppliers(data ?? []);
        }
      } catch (error) {
        console.error("❌ Unexpected error fetching suppliers:", error);
        toast.error("Unexpected error loading suppliers.");
      }
    };

    if (!loading && companyId) fetchSuppliers();
  }, [companyId, loading]);

  const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchTerm = normalizeText(search);
    return (
      normalizeText(supplier.name).includes(searchTerm) ||
      supplier.document.replace(/\D/g, "").includes(search.replace(/\D/g, "")) ||
      supplier.phone.replace(/\D/g, "").includes(search.replace(/\D/g, ""))
    );
  });

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
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Search by name, document or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />
        <Button size="sm" onClick={() => router.push("/dashboard/suppliers/add")} className="w-full sm:w-auto">
          Add Supplier
        </Button>
      </div>

      <div className="p-4 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Document</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">City</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} onClick={() => openModal(supplier)} className="cursor-pointer hover:bg-gray-100">
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
                  No suppliers found
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
              <DialogTitle>Supplier Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedSupplier.name}</p>
              {selectedSupplier.fantasy_name && <p><strong>Fantasy Name:</strong> {selectedSupplier.fantasy_name}</p>}
              <p><strong>Type:</strong> {selectedSupplier.type}</p>
              <p><strong>Document:</strong> {selectedSupplier.document}</p>
              <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
              <p><strong>ZIP Code:</strong> {selectedSupplier.zip_code}</p>
              <p><strong>Address:</strong> {[
                selectedSupplier.address,
                selectedSupplier.neighborhood,
                selectedSupplier.number
              ].filter(Boolean).join(", ")}</p>
              {selectedSupplier.complement && <p><strong>Complement:</strong> {selectedSupplier.complement}</p>}
              <p><strong>City:</strong> {selectedSupplier.city}</p>
              <p><strong>State:</strong> {selectedSupplier.state}</p>
              <p><strong>Email:</strong> {selectedSupplier.email || ""}</p>
              {selectedSupplier.state_registration && <p><strong>State Registration:</strong> {selectedSupplier.state_registration}</p>}
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="destructive" onClick={() => handleDelete(selectedSupplier.id)}>
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Supplier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}