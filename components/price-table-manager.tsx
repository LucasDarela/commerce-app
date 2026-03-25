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

type Catalog = {
  id?: string;
  name: string;
  products: { product_id: string; price: number }[];
};

export function PriceTableManager() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [savedCatalogs, setSavedCatalogs] = useState<Catalog[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const { companyId, loading } = useAuthenticatedCompany();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingCatalogIndex, setEditingCatalogIndex] = useState<number | null>(
    null,
  );

  // ================= PRODUCTS =================
  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name");

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
  }, [supabase]);

  // ================= CATALOGS =================
  useEffect(() => {
    let cancelled = false;

    const fetchSavedCatalogs = async () => {
      if (!companyId) return;

      const { data: tables, error } = await supabase
        .from("price_tables")
        .select("id, name")
        .eq("company_id", companyId);

      if (cancelled) return;

      if (error) {
        toast.error("Erro ao buscar catálogos.");
        return;
      }

      const fullCatalogs: Catalog[] = [];

      for (const table of tables || []) {
        const { data: products } = await supabase
          .from("price_table_products")
          .select("product_id, price")
          .eq("price_table_id", table.id);

        fullCatalogs.push({
          id: table.id,
          name: table.name,
          products: products || [],
        });
      }

      if (!cancelled) {
        setSavedCatalogs(fullCatalogs);
      }
    };

    fetchSavedCatalogs();

    return () => {
      cancelled = true;
    };
  }, [companyId, supabase]);

  // ================= ACTIONS =================
  const handleAddCatalog = () => {
    setCatalogs((prev) => [...prev, { name: "", products: [] }]);
  };

  const updateCatalog = (index: number, updatedCatalog: Catalog) => {
    setCatalogs((prev) => {
      const updated = [...prev];
      updated[index] = updatedCatalog;
      return updated;
    });
  };

  const handleSaveCatalogs = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const newSaved: Catalog[] = [];

    for (const catalog of catalogs) {
      if (!catalog.name) {
        toast.error("Todos os catálogos precisam de nome.");
        return;
      }

      const validProducts = catalog.products.filter(
        (p) => !isNaN(p.price) && p.price > 0,
      );

      if (validProducts.length === 0) {
        toast.error(`"${catalog.name}" precisa de pelo menos 1 preço.`);
        continue;
      }

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
        products: payload,
      });
    }

    if (newSaved.length > 0) {
      toast.success("Catálogos salvos!");
      setCatalogs([]);
      setSavedCatalogs((prev) => [...prev, ...newSaved]);
    }
  };

  const handleDeleteCatalog = async (index: number) => {
    const catalog = savedCatalogs[index];
    if (!catalog.id) return;

    const { error } = await supabase
      .from("price_tables")
      .delete()
      .eq("id", catalog.id);

    if (error) {
      toast.error("Erro ao deletar.");
      return;
    }

    setSavedCatalogs((prev) => prev.filter((_, i) => i !== index));
    toast.success("Deletado!");
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
                  <Button size="sm" onClick={() => setEditingCatalogIndex(idx)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setExpandedIndex((prev) =>
                        prev === idx ? null : idx,
                      )
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
                          className="flex justify-between"
                        >
                          <span>{info?.name || "Produto"}</span>
                          <span>R$ {p.price.toFixed(2)}</span>
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