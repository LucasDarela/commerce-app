"use client";

import { useEffect, useState } from "react";
import { fetchOrders } from "@/lib/fetchOrders";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import DataFinancialTable from "@/components/financial/DataFinancialTable";
import { Order } from "@/components/types/order";
import FiscalOperationsPage from "@/components/nf/FiscalOperationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NfePage() {
  const { companyId } = useAuthenticatedCompany();

  useEffect(() => {
    if (!companyId) return;
  }, [companyId]);

  //   if (loading) return <p className="p-4">Loading NFe...</p>

  return (
    <Tabs defaultValue="nfe" className="w-full px-4 py-4 md:gap-6 md:py-6 ">
      <TabsList>
        <TabsTrigger value="nfe">Nfe</TabsTrigger>
        <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
      </TabsList>
      <TabsContent value="nfe">
        <h1 className="font-bold">🚧 Em Construção 🚧</h1>
        <p className="text-sm text-muted-foreground">
          🏗️ Retornará todas as notas fiscais já emitidas.
        </p>
      </TabsContent>
      <TabsContent value="cadastro">
        <FiscalOperationsPage />
      </TabsContent>
    </Tabs>
  );
}
