"use client";

import { useState, useEffect, useMemo } from "react";
import * as React from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "./ui/TableSkeleton";

type Product = {
  id: string;
  name: string;
};

type CatalogProduct = {
  product_id: string;
  price: number;
};

type Catalog = {
  id?: string;
  name: string;
  products: CatalogProduct[];
};

export function PriceTableManager() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();

  const [savedCatalogs, setSavedCatalogs] = useState<Catalog[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ================= PRODUCTS =================
  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        toast.error("Erro ao carregar produtos");
      } else {
        setAvailableProducts(data || []);
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId]);

  // ================= CATALOGS =================
  const fetchSavedCatalogs = async () => {
    if (!companyId) return;

    const { data: tables, error } = await supabase
      .from("price_tables")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao buscar catálogos.");
      return;
    }

    const fullCatalogs: Catalog[] = [];

    for (const table of tables || []) {
      const { data: products, error: productsError } = await supabase
        .from("price_table_products")
        .select("product_id, price")
        .eq("price_table_id", table.id);

      if (productsError) {
        toast.error(`Erro ao buscar produtos do catálogo "${table.name}"`);
        continue;
      }

      fullCatalogs.push({
        id: table.id,
        name: table.name,
        products: products || [],
      });
    }

    setSavedCatalogs(fullCatalogs);
  };

  useEffect(() => {
    fetchSavedCatalogs();
  }, [companyId, supabase]);

  // ================= HELPERS =================
  const validateCatalog = (catalog: Catalog) => {
    if (!catalog.name.trim()) {
      toast.error("O catálogo precisa de um nome.");
      return false;
    }

    const validProducts = catalog.products.filter(
      (p) => !isNaN(p.price) && p.price > 0,
    );

    if (validProducts.length === 0) {
      toast.error(`"${catalog.name}" precisa de pelo menos 1 preço.`);
      return false;
    }

    return true;
  };

  const updateCatalog = (index: number, updatedCatalog: Catalog) => {
    setCatalogs((prev) => {
      const updated = [...prev];
      updated[index] = updatedCatalog;
      return updated;
    });
  };

  const updateEditingCatalogProduct = (productId: string, value: string) => {
    if (!editingCatalog) return;

    const updatedProducts = [...editingCatalog.products];
    const idx = updatedProducts.findIndex((p) => p.product_id === productId);

    if (!value) {
      setEditingCatalog({
        ...editingCatalog,
        products: updatedProducts.filter((p) => p.product_id !== productId),
      });
      return;
    }

    const price = parseFloat(value);

    if (idx >= 0) {
      updatedProducts[idx].price = price || 0;
    } else {
      updatedProducts.push({
        product_id: productId,
        price: price || 0,
      });
    }

    setEditingCatalog({
      ...editingCatalog,
      products: updatedProducts,
    });
  };

  // ================= CREATE =================
  const handleAddCatalog = () => {
    setCatalogs((prev) => [...prev, { name: "", products: [] }]);
  };

  const handleSaveCatalogs = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const newSaved: Catalog[] = [];

    for (const catalog of catalogs) {
      if (!validateCatalog(catalog)) return;

      const validProducts = catalog.products.filter(
        (p) => !isNaN(p.price) && p.price > 0,
      );

      const { data: table, error } = await supabase
        .from("price_tables")
        .insert({
          name: catalog.name,
          company_id: companyId,
        })
        .select("id")
        .single();

      if (error || !table) {
        toast.error(`Erro ao salvar ${catalog.name}`);
        continue;
      }

      const payload = validProducts.map((p) => ({
        price_table_id: table.id,
        product_id: p.product_id,
        price: p.price,
      }));

      const { error: insertError } = await supabase
        .from("price_table_products")
        .insert(payload);

      if (insertError) {
        await supabase.from("price_tables").delete().eq("id", table.id);
        toast.error(`Erro ao salvar produtos de ${catalog.name}`);
        continue;
      }

      newSaved.push({
        id: table.id,
        name: catalog.name,
        products: validProducts,
      });
    }

    if (newSaved.length > 0) {
      toast.success("Catálogos salvos!");
      setCatalogs([]);
      setSavedCatalogs((prev) => [...prev, ...newSaved]);
    }
  };

  // ================= EDIT =================
  const handleStartEditCatalog = (index: number) => {
    const catalog = savedCatalogs[index];

    setEditingCatalog({
      id: catalog.id,
      name: catalog.name,
      products: catalog.products.map((p) => ({
        product_id: p.product_id,
        price: p.price,
      })),
    });
  };

  const handleUpdateCatalog = async () => {
    if (!editingCatalog?.id) {
      toast.error("Catálogo inválido para edição.");
      return;
    }

    if (!validateCatalog(editingCatalog)) return;

    setIsSavingEdit(true);

    try {
      const validProducts = editingCatalog.products.filter(
        (p) => !isNaN(p.price) && p.price > 0,
      );

      const { error: tableError } = await supabase
        .from("price_tables")
        .update({ name: editingCatalog.name })
        .eq("id", editingCatalog.id)
        .eq("company_id", companyId);

      if (tableError) {
        toast.error("Erro ao atualizar o nome do catálogo.");
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("price_table_products")
        .delete()
        .eq("price_table_id", editingCatalog.id);

      if (deleteItemsError) {
        toast.error("Erro ao atualizar os produtos do catálogo.");
        return;
      }

      const payload = validProducts.map((p) => ({
        price_table_id: editingCatalog.id!,
        product_id: p.product_id,
        price: p.price,
      }));

      const { error: insertItemsError } = await supabase
        .from("price_table_products")
        .insert(payload);

      if (insertItemsError) {
        toast.error("Erro ao salvar os novos preços.");
        return;
      }

      setSavedCatalogs((prev) =>
        prev.map((catalog) =>
          catalog.id === editingCatalog.id
            ? {
                ...catalog,
                name: editingCatalog.name,
                products: validProducts,
              }
            : catalog,
        ),
      );

      toast.success("Catálogo atualizado com sucesso!");
      setEditingCatalog(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ================= DELETE =================
  const handleDeleteCatalog = async (index: number) => {
    const catalog = savedCatalogs[index];
    if (!catalog.id) return;

    // Verificar se clientes estão usando este catálogo
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("price_table_id", catalog.id)
      .eq("company_id", companyId);

    if (count && count > 0) {
      toast.error(`Não é possível deletar: existem ${count} cliente(s) vinculado(s) a este catálogo.`);
      return;
    }

    // Deletar os itens (produtos) do catálogo antes, pois pode não haver ON DELETE CASCADE no banco
    const { error: itemsError } = await supabase
      .from("price_table_products")
      .delete()
      .eq("price_table_id", catalog.id);

    if (itemsError) {
      toast.error("Erro ao deletar os itens do catálogo.");
      return;
    }

    const { error } = await supabase
      .from("price_tables")
      .delete()
      .eq("id", catalog.id)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao deletar o catálogo principal.");
      return;
    }

    setSavedCatalogs((prev) => prev.filter((_, i) => i !== index));

    if (editingCatalog?.id === catalog.id) {
      setEditingCatalog(null);
    }

    toast.success("Catálogo deletado!");
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6 px-6 mt-9">
      <h2 className="text-xl font-bold">Catálogo Personalizado</h2>

      {/* ================= LIST ================= */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {savedCatalogs.map((catalog, idx) => (
            <React.Fragment key={catalog.id || idx}>
              <TableRow>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{catalog.name}</TableCell>
                <TableCell>{catalog.products.length}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" onClick={() => handleStartEditCatalog(idx)}>
                    Editar
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setExpandedIndex((prev) => (prev === idx ? null : idx))
                    }
                  >
                    {expandedIndex === idx ? "Ocultar" : "Ver"}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCatalog(idx)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>

              {expandedIndex === idx && (
                <TableRow>
                  <TableCell colSpan={4}>
                    {catalog.products.map((p) => {
                      const info = availableProducts.find(
                        (ap) => ap.id === p.product_id,
                      );

                      return (
                        <div
                          key={p.product_id}
                          className="flex justify-between py-1"
                        >
                          <span>{info?.name || "Produto"}</span>
                          <span>R$ {Number(p.price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* ================= EDIT ================= */}
      {editingCatalog && (
        <Card className="p-4 space-y-4 border-primary">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Editando catálogo</h3>
            <Button
              variant="outline"
              onClick={() => setEditingCatalog(null)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
          </div>

          <Input
            placeholder="Nome do catálogo"
            value={editingCatalog.name}
            onChange={(e) =>
              setEditingCatalog({
                ...editingCatalog,
                name: e.target.value,
              })
            }
          />

          {availableProducts.map((product) => {
            const selected = editingCatalog.products.find(
              (p) => p.product_id === product.id,
            );

            return (
              <div key={product.id} className="grid grid-cols-2 gap-4">
                <span>{product.name}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={selected?.price ?? ""}
                  onChange={(e) =>
                    updateEditingCatalogProduct(product.id, e.target.value)
                  }
                />
              </div>
            );
          })}

          <Button
            onClick={handleUpdateCatalog}
            className="w-full"
            disabled={isSavingEdit}
          >
            {isSavingEdit ? "Salvando..." : "Salvar edição"}
          </Button>
        </Card>
      )}

      {/* ================= CREATE ================= */}
      <Button onClick={handleAddCatalog}>+ Adicionar</Button>

      {catalogs.map((catalog, index) => (
        <Card key={index} className="p-4 space-y-4">
          <Input
            placeholder="Nome do catálogo"
            value={catalog.name}
            onChange={(e) =>
              updateCatalog(index, { ...catalog, name: e.target.value })
            }
          />

          {availableProducts.map((product) => {
            const selected = catalog.products.find(
              (p) => p.product_id === product.id,
            );

            return (
              <div key={product.id} className="grid grid-cols-2 gap-4">
                <span>{product.name}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={selected?.price ?? ""}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value);
                    const updated = [...catalog.products];

                    const idx = updated.findIndex(
                      (p) => p.product_id === product.id,
                    );

                    if (!e.target.value) {
                      updateCatalog(index, {
                        ...catalog,
                        products: updated.filter(
                          (p) => p.product_id !== product.id,
                        ),
                      });
                      return;
                    }

                    if (idx >= 0) {
                      updated[idx].price = price || 0;
                    } else {
                      updated.push({
                        product_id: product.id,
                        price: price || 0,
                      });
                    }

                    updateCatalog(index, {
                      ...catalog,
                      products: updated,
                    });
                  }}
                />
              </div>
            );
          })}
        </Card>
      ))}

      {catalogs.length > 0 && (
        <Button onClick={handleSaveCatalogs} className="w-full">
          Salvar
        </Button>
      )}
    </div>
  );
}