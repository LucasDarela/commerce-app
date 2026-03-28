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
import { ExportProductsButton } from "@/components/products/ExportProductsButton";

type Equipment = {
  id: string;
  name: string;
};

type Product = {
  id: number;
  code: string | number | null;
  name: string | null;
  manufacturer: string | null;
  standard_price: string | number | null;
  material_class: string | null;
  submaterial_class: string | null;
  material_origin: string | null;
  aplication: string | null;
  loan_product_code?: string | null;
  stock: number | null;
  ncm: string | null;
  cfop: string | null;
  csosn: string | null;
  unit: string | null;
  icms_rate: string | null;
  pis_rate: string | null;
  cofins_rate: string | null;
  company_id?: string;
};

export default function ListProduct() {
  const { companyId, loading } = useAuthenticatedCompany();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  useEffect(() => {
    if (!companyId || loading) return;

    let isMounted = true;

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
          return;
        }

        if (isMounted) {
          setProducts((data as Product[]) ?? []);
        }
      } catch (error) {
        toast.error("Unexpected error while loading products.");
        console.error(error);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [companyId, loading, supabase]);

  useEffect(() => {
    if (!companyId || loading) return;

    let isMounted = true;

    const fetchEquipments = async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, name")
        .eq("company_id", companyId);

      if (error) {
        toast.error("Erro ao buscar equipamentos");
        return;
      }

      if (isMounted) {
        setEquipments((data as Equipment[]) ?? []);
      }
    };

    fetchEquipments();

    return () => {
      isMounted = false;
    };
  }, [companyId, loading, supabase]);

  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const name = String(product.name ?? "").toLowerCase();
    const code = String(product.code ?? "").toLowerCase();

    if (!term) return true;

    return name.includes(term) || code.includes(term);
  });

  const equipmentMap = equipments.reduce(
    (map, eq) => {
      map[eq.id] = eq.name;
      return map;
    },
    {} as Record<string, string>,
  );

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleEdit = () => {
    if (!selectedProduct) return;
    router.push(`/dashboard/products/${selectedProduct.id}/edit`);
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Failed to delete product.");
      console.error(error.message);
      return;
    }

    toast.success("Product successfully deleted!");
    setProducts((prev) => prev.filter((p) => p.id !== id));
    closeModal();
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="p-6 mt-3">
      <h2 className="text-xl font-bold mb-4">Produtos</h2>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch">
        <Input
          type="text"
          placeholder="Pesquise por Código ou Nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 p-2 border rounded-md"
        />

        <Link href="/dashboard/products/add">
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px] w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="mr-1" />
            <span className="hidden sm:inline">Produto</span>
          </Button>
        </Link>
      </div>

      <div className="p-6 rounded-lg shadow-md overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="hidden sm:table-row">
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço Compra</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Equipamento Vinculado</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="cursor-pointer h-[50px]"
                >
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.material_class || "N/A"}</TableCell>
                  <TableCell>{product.standard_price}</TableCell>
                  <TableCell>{product.stock ?? 0}</TableCell>
                  <TableCell>
                    {equipmentMap[product.loan_product_code ?? ""] ?? ""}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum produto encontrado...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end w-full my-4">
        <ExportProductsButton />
      </div>

      {selectedProduct && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Produto</DialogTitle>
                <DialogDescription>
                  Informações detalhadas do produto selecionado.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p>
                <strong>Código:</strong> {selectedProduct.code}
              </p>
              <p>
                <strong>Nome:</strong> {selectedProduct.name}
              </p>
              <p>
                <strong>Fabricante:</strong> {selectedProduct.manufacturer}
              </p>
              <p>
                <strong>Preço Compra:</strong> {selectedProduct.standard_price}
              </p>
              <p>
                <strong>Estoque:</strong> {selectedProduct.stock ?? 0}
              </p>
              <p>
                <strong>Comodato:</strong>{" "}
                {equipmentMap[selectedProduct.loan_product_code ?? ""] ??
                  "Sem equipamento vinculado"}
              </p>
            </div>

            <DialogFooter className="w-full">
              <div className="grid grid-cols-5 gap-4 w-full">
                <Button onClick={handleEdit} className="col-span-4">
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedProduct.id)}
                  className="col-span-1"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}