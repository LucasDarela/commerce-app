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
import { Card } from "@/components/ui/card";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

// 🔹 Product Type
type Product = {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  standard_price: string;
  percentage_taxes: string;
  material_class: string;
  submaterial_class: string;
  tax_classification: string;
  material_origin: string;
  aplication: string;
  loan_product_code?: string;
  stock: number;
  image_url?: string;
  company_id: string;
};

export default function ListProduct() {
  const { user, companyId, loading } = useAuthenticatedCompany();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!companyId || loading) return;

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("company_id", companyId)
          .order("code", { ascending: true });

        if (error) {
          toast.error("Failed to load products.");
          console.error(error.message);
        } else {
          setProducts(data ?? []);
        }
      } catch (error) {
        toast.error("Unexpected error while loading products.");
        console.error(error);
      }
    };

    fetchProducts();
  }, [companyId, loading]);

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.code.toLowerCase().includes(searchTerm)
    );
  });

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleEdit = () => {
    if (selectedProduct) {
      router.push(`/dashboard/products/${selectedProduct.id}/edit`);
      closeModal();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete product.");
      console.error(error.message);
    } else {
      toast.success("Product successfully deleted!");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      closeModal();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading products...
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex flex-col-2 gap-6">
        <Input
          type="text"
          placeholder="Search by Code or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />
        <Button size="sm" onClick={() => router.push("/dashboard/products/add")} className="w-full sm:w-auto">
          Adicionar Produto
        </Button>
      </div>

      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="hidden sm:table-row">
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Comodato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="cursor-pointer hover:bg-gray-100 h-[50px]"
                >
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.material_class || "N/A"}</TableCell>
                  <TableCell>{product.standard_price}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.loan_product_code || ""}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No products found...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedProduct && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {selectedProduct.image_url && (
                <Card className="p-4 flex justify-center">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="h-40 object-cover rounded-lg shadow-md"
                  />
                </Card>
              )}
              <p><strong>Codigo:</strong> {selectedProduct.code}</p>
              <p><strong>Nome:</strong> {selectedProduct.name}</p>
              <p><strong>Fabricante:</strong> {selectedProduct.manufacturer}</p>
              <p><strong>Preço:</strong> {selectedProduct.standard_price}</p>
              <p><strong>Taxas:</strong> {selectedProduct.percentage_taxes}</p>
              <p><strong>Classe:</strong> {selectedProduct.material_class}</p>
              <p><strong>Subclasse:</strong> {selectedProduct.submaterial_class}</p>
              <p><strong>Classificação Tributária:</strong> {selectedProduct.tax_classification}</p>
              <p><strong>Origem:</strong> {selectedProduct.material_origin}</p>
              <p><strong>Aplicação:</strong> {selectedProduct.aplication}</p>
              <p><strong>Estoque:</strong> {selectedProduct.stock}</p>
              <p><strong>Comodato:</strong> {selectedProduct.loan_product_code}</p>
            </div>
            <DialogFooter className="flex justify-between">
            <Button onClick={handleEdit}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedProduct.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}