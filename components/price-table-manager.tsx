'use client'

import { useState, useEffect } from 'react'
import * as React from "react"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthenticatedCompany } from '@/hooks/useAuthenticatedCompany'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

type Product = {
  id: string
  name: string
}

type Catalog = {
    id?: string // agora pode ter ID
    name: string
    products: { product_id: string; price: number }[]
  }

export function PriceTableManager() {
    const [savedCatalogs, setSavedCatalogs] = useState<Catalog[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const { companyId } = useAuthenticatedCompany()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [editingCatalogIndex, setEditingCatalogIndex] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('id, name')
      if (error) {
        toast.error('Erro ao carregar produtos')
      } else {
        setAvailableProducts(data || [])
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    const fetchSavedCatalogs = async () => {
      if (!companyId) return
  
      const { data: tables, error } = await supabase
        .from("price_tables")
        .select("id, name")
        .eq("company_id", companyId)
  
      if (error) {
        toast.error("Erro ao buscar catálogos salvos.")
        console.error(error)
        return
      }
  
      const fullCatalogs: Catalog[] = []
  
      for (const table of tables) {
        const { data: products, error: productError } = await supabase
          .from("price_table_products")
          .select("product_id, price")
          .eq("price_table_id", table.id)
  
        if (productError) {
          toast.error(`Erro ao carregar produtos de ${table.name}`)
          continue
        }
  
        fullCatalogs.push({
            id: table.id, 
            name: table.name,
            products: products || [],
          })
      }
  
      setSavedCatalogs(fullCatalogs)
    }
  
    fetchSavedCatalogs()
  }, [companyId])

  const handleAddCatalog = () => {
    setCatalogs((prev) => [...prev, { name: '', products: [] }])
  }

  const updateCatalog = (index: number, updatedCatalog: Catalog) => {
    const updated = [...catalogs]
    updated[index] = updatedCatalog
    setCatalogs(updated)
  }

  const handleSaveCatalogs = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.")
      return
    }
  
    const newSavedCatalogs: Catalog[] = []
  
    for (const catalog of catalogs) {
      if (!catalog.name) {
        toast.error("Todos os catálogos precisam de um nome.")
        return
      }
  
      // 1. Cria o catálogo
      const { data: priceTable, error: tableError } = await supabase
        .from("price_tables")
        .insert({
          name: catalog.name,
          company_id: companyId,
        })
        .select("id")
        .single()
  
      if (tableError) {
        toast.error(`Erro ao salvar catálogo: ${catalog.name}`)
        console.error(tableError)
        continue
      }
  
      // 2. Filtra apenas produtos com preço válido
      const productsData = Array.from(
        new Map(
          catalog.products
            .filter((p) => !isNaN(p.price) && p.price > 0)
            .map((p) => [p.product_id, p])
        ).values()
      ).map((p) => ({
        price_table_id: priceTable.id,
        product_id: p.product_id,
        price: p.price,
      }))
  
      if (productsData.length === 0) {
        toast.error(`Catálogo ${catalog.name} não possui preços válidos.`)
        continue
      }
      
  
      const { error: productsError } = await supabase
        .from("price_table_products")
        .insert(productsData)
  
      if (productsError) {
        toast.error(`Erro ao salvar produtos para ${catalog.name}`)
        console.error("Erro ao salvar produtos:", productsError)
        continue
      }
  
      // ✅ Adiciona catálogo salvo para exibição
      newSavedCatalogs.push({
        id: priceTable.id, // agora temos ID
        name: catalog.name,
        products: productsData.map((p) => ({
          product_id: p.product_id,
          price: p.price
        })),
      })
    }
  
    if (newSavedCatalogs.length > 0) {
      toast.success("Catálogos salvos com sucesso!")
      setCatalogs([]) // limpa inputs
      setSavedCatalogs((prev) => [...prev, ...newSavedCatalogs]) // atualiza tabela abaixo
    }
    
  }

  const handleDeleteCatalog = async (catalogIndex: number) => {
    const catalog = savedCatalogs[catalogIndex]
    if (!catalog.id) return

    const { error } = await supabase
      .from("price_tables")
      .delete()
      .eq("id", catalog.id) 
  
    if (error) {
      toast.error("Erro ao deletar catálogo.")
      return
    }
  
    toast.success("Catálogo deletado com sucesso.")
    setSavedCatalogs((prev) => prev.filter((_, i) => i !== catalogIndex))
  }

  return (
            <div className="space-y-6 p-8">
            <h2 className="text-xl font-bold">Catálogo Personalizado</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nome do Catálogo</TableHead>
                <TableHead>Total de Produtos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {savedCatalogs.map((catalog, idx) => (
  <React.Fragment key={`catalog-${idx}`}>
    <TableRow>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{catalog.name}</TableCell>
      <TableCell>{catalog.products.length}</TableCell>
      <TableCell className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditingCatalogIndex(idx)}
      >
        Editar
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          setExpandedIndex((prev) => (prev === idx ? null : idx))
        }
      >
        {expandedIndex === idx ? "Ocultar" : "Ver Produtos"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDeleteCatalog(idx)}
      >
        Delete
      </Button>
      </TableCell>
    </TableRow>

    {expandedIndex === idx && (
      <TableRow>
        <TableCell colSpan={4}>
          <div className="space-y-2 pl-4">
          {[...new Map(
            catalog.products.map(p => [p.product_id, p])
          ).values()].map((product) => {
            const productInfo = availableProducts.find(
              (p) => p.id === product.product_id
            )
            return (
              <div
                key={product.product_id}
                className="flex justify-between"
              >
                <span>{productInfo?.name || "Produto desconhecido"}</span>
                <span>
                  R$ {Number(product.price).toFixed(2)}
                </span>
              </div>
            )
          })}
          </div>
        </TableCell>
      </TableRow>
    )}
  </React.Fragment>
))}
            </TableBody>
            </Table>

          <Button onClick={handleAddCatalog}>+ Adicionar Catálogo</Button>

          {catalogs.map((catalog, index) => (
            <Card key={index} className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">Catálogo #{index + 1}</h2>
              <Input
                placeholder="Nome do catálogo (ex: Delivery, PDV)"
                value={catalog.name}
                onChange={(e) =>
                  updateCatalog(index, { ...catalog, name: e.target.value })
                }
              />

              {availableProducts.map((product) => {
                const selectedProduct = catalog.products.find(
                  (p) => p.product_id === product.id
                )
                return (
                  <div
                    key={product.id}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <span>{product.name}</span>
                    <Input
                      placeholder="R$"
                      type="number"
                      step="0.01"
                      value={selectedProduct?.price ?? ''}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value);
                        
                        if (editingCatalogIndex === null) return; // Não precisa retornar null, só sair
                      
                        const catalog = savedCatalogs[editingCatalogIndex];
                        
                        const updatedProducts = [...catalog.products];
                      
                        const existingProductIndex = updatedProducts.findIndex(
                          (p) => p.product_id === product.id
                        );
                      
                        if (existingProductIndex >= 0) {
                          updatedProducts[existingProductIndex] = {
                            ...updatedProducts[existingProductIndex],
                            price,
                          };
                        } else if (!isNaN(price) && price > 0) {
                          updatedProducts.push({
                            product_id: product.id,
                            price,
                          });
                        }
                      
                        const updatedCatalog = {
                          ...catalog,
                          products: updatedProducts,
                        };
                      
                        const updatedSaved = [...savedCatalogs];
                        updatedSaved[editingCatalogIndex] = updatedCatalog;
                        setSavedCatalogs(updatedSaved);
                      }}
                    />
                  </div>
                )
              })}
            </Card>
          ))}

          {catalogs.length > 0 && (
            <Button onClick={handleSaveCatalogs} className="w-full">
              Salvar Catálogo no Banco de Dados
            </Button>
          )}

{editingCatalogIndex !== null && (
  <Card className="p-4 space-y-4 mt-4">
    <h2 className="text-lg font-semibold">Editando: {savedCatalogs[editingCatalogIndex].name}</h2>

    {availableProducts.map((product) => {
      const catalog = savedCatalogs[editingCatalogIndex]!;
      const selectedProduct = catalog.products.find(
        (p) => p.product_id === product.id
      );

      return (
        <div
          key={product.id}
          className="grid grid-cols-2 items-center gap-4"
        >
          <span>{product.name}</span>
          <Input
            placeholder="R$"
            type="number"
            step="0.01"
            value={selectedProduct?.price ?? ''}
            onChange={(e) => {
              const price = parseFloat(e.target.value);
            
              const catalog = savedCatalogs[editingCatalogIndex]!;
              const existingProductIndex = catalog.products.findIndex(p => p.product_id === product.id);
              let updatedProducts = [...catalog.products];
            
              if (existingProductIndex >= 0) {
                updatedProducts[existingProductIndex] = { ...updatedProducts[existingProductIndex], price };
              } else if (!isNaN(price) && price > 0) {
                updatedProducts.push({ product_id: product.id, price });
              }
            
              const updatedCatalog = {
                ...catalog,
                products: updatedProducts,
              };
            
              const updatedSaved = [...savedCatalogs];
              updatedSaved[editingCatalogIndex] = updatedCatalog;
              setSavedCatalogs(updatedSaved);
            }}
          />
        </div>
      );
    })}

    <div className="flex gap-2">
    <Button
  onClick={async () => {
    const catalog = savedCatalogs[editingCatalogIndex];
    if (!catalog.id) return;

    const cleanedProducts = Array.from(
      new Map(
        catalog.products
          .filter((p) => !isNaN(p.price) && p.price > 0)
          .map((p) => [p.product_id, p])
      ).values()
    );

    const { error: deleteError } = await supabase
      .from("price_table_products")
      .delete()
      .eq("price_table_id", catalog.id);

    if (deleteError) {
      toast.error("Erro ao limpar catálogo antigo.");
      return;
    }

    const { error: insertError } = await supabase
      .from("price_table_products")
      .insert(
        cleanedProducts.map((p) => ({
          price_table_id: catalog.id,
          product_id: p.product_id,
          price: p.price,
        }))
      );

    if (insertError) {
      toast.error("Erro ao atualizar produtos.");
      return;
    }

    toast.success("Catálogo atualizado com sucesso.");

    const updatedCatalogs = [...savedCatalogs];
    updatedCatalogs[editingCatalogIndex] = {
      ...catalog,
      products: cleanedProducts,
    };
    setSavedCatalogs(updatedCatalogs);

    setEditingCatalogIndex(null);
  }}
>
  Salvar Alterações
</Button>
      <Button
        variant="outline"
        onClick={() => setEditingCatalogIndex(null)}
      >
        Cancelar
      </Button>
    </div>
  </Card>
)}
          </div>
          )
          }