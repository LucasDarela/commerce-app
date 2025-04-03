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
          className="w-full p-2 border rounded-md"
        />
        <Button onClick={() => router.push("/dashboard/products/add")} className="w-full sm:w-auto">
          Add Product
        </Button>
      </div>

      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="hidden sm:table-row">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Loan Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="cursor-pointer hover:bg-gray-100"
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
              <DialogTitle>Product Details</DialogTitle>
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
              <p><strong>Code:</strong> {selectedProduct.code}</p>
              <p><strong>Name:</strong> {selectedProduct.name}</p>
              <p><strong>Manufacturer:</strong> {selectedProduct.manufacturer}</p>
              <p><strong>Price:</strong> {selectedProduct.standard_price}</p>
              <p><strong>Taxes:</strong> {selectedProduct.percentage_taxes}</p>
              <p><strong>Class:</strong> {selectedProduct.material_class}</p>
              <p><strong>Subclass:</strong> {selectedProduct.submaterial_class}</p>
              <p><strong>Tax Classification:</strong> {selectedProduct.tax_classification}</p>
              <p><strong>Origin:</strong> {selectedProduct.material_origin}</p>
              <p><strong>Application:</strong> {selectedProduct.aplication}</p>
              <p><strong>Stock:</strong> {selectedProduct.stock}</p>
              <p><strong>Loan Code:</strong> {selectedProduct.loan_product_code}</p>
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="destructive" onClick={() => handleDelete(selectedProduct.id)}>
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}