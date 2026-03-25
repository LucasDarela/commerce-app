"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarrelTable, BarrelEntry } from "./barrel-table";

interface Supplier {
  id: string;
  name: string;
}

interface BarrelRecord {
  supplier_id: string;
  suppliers?: { name: string } | null;
  id: string;
  date: string;
  note?: string | null;
  had_30?: number | null;
  had_50?: number | null;
  arrived_30?: number | null;
  arrived_50?: number | null;
  returned_30?: number | null;
  returned_50?: number | null;
  total_30?: number | null;
  total_50?: number | null;
}

type SupplierTab = {
  supplier: Supplier;
  rows: BarrelEntry[];
};

type BarrelRecordRaw = Omit<BarrelRecord, "suppliers"> & {
  suppliers?: { name: string }[] | { name: string } | null;
};

export default function BarrelControl() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId } = useAuthenticatedCompany();

  const [tabs, setTabs] = useState<SupplierTab[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | undefined>(undefined);

  const [searchSupplier, setSearchSupplier] = useState("");
  const [foundSuppliers, setFoundSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  function formatDateFromDB(dateString: string) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatDateToYMD(dateStr: string) {
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year) return null;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const fetchInitialData = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("barrel_controls")
      .select(`
        supplier_id,
        suppliers:suppliers!inner(name),
        id,
        date,
        note,
        had_30,
        had_50,
        arrived_30,
        arrived_50,
        returned_30,
        returned_50,
        total_30,
        total_50
      `)
      .eq("company_id", companyId)
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao buscar dados iniciais");
      return;
    }

    if (!data?.length) {
      setTabs([]);
      setSelectedTab(undefined);
      return;
    }

    const suppliersMap: Record<string, SupplierTab> = {};

const normalizedData = ((data ?? []) as BarrelRecordRaw[]).map((record) => ({
  ...record,
  suppliers: Array.isArray(record.suppliers)
    ? record.suppliers[0] ?? null
    : record.suppliers,
})) as BarrelRecord[];

normalizedData.forEach((record) => {
  const supplierId = record.supplier_id;

  if (!suppliersMap[supplierId]) {
    suppliersMap[supplierId] = {
      supplier: {
        id: supplierId,
        name: record.suppliers?.name || "Fornecedor desconhecido",
      },
      rows: [],
    };
  }

  suppliersMap[supplierId].rows.push({
    id: record.id,
    date: formatDateFromDB(record.date),
    note: record.note || "",
    had_30: record.had_30 || 0,
    had_50: record.had_50 || 0,
    arrived_30: record.arrived_30 || 0,
    arrived_50: record.arrived_50 || 0,
    returned_30: record.returned_30 || 0,
    returned_50: record.returned_50 || 0,
    total_30: record.total_30 || 0,
    total_50: record.total_50 || 0,
  });
});

    const loadedTabs = Object.values(suppliersMap);
    setTabs(loadedTabs);
    setSelectedTab((prev) => prev ?? loadedTabs[0]?.supplier.id);
  };

  useEffect(() => {
    fetchInitialData();
  }, [companyId]);

  const handleSearchSupplier = async (value: string) => {
    setSearchSupplier(value);

    if (!companyId || value.trim().length < 2) {
      setFoundSuppliers([]);
      return;
    }

    setLoadingSuppliers(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("company_id", companyId)
      .ilike("name", `%${value.trim()}%`)
      .order("name", { ascending: true })
      .limit(5);

    if (error) {
      console.error(error);
      setFoundSuppliers([]);
    } else {
      setFoundSuppliers(data || []);
    }

    setLoadingSuppliers(false);
  };

  const handleAddSupplier = (supplier: Supplier) => {
    const exists = tabs.some((tab) => tab.supplier.id === supplier.id);

    if (exists) {
      toast.error("Fornecedor já adicionado");
      return;
    }

    setTabs((prev) => [...prev, { supplier, rows: [] }]);
    setSelectedTab(supplier.id);
    setSearchSupplier("");
    setFoundSuppliers([]);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    for (const tab of tabs) {
      const { error: deleteError } = await supabase
        .from("barrel_controls")
        .delete()
        .eq("company_id", companyId)
        .eq("supplier_id", tab.supplier.id);

      if (deleteError) {
        console.error(deleteError);
        toast.error(`Erro ao limpar dados do fornecedor ${tab.supplier.name}`);
        return;
      }

      const insertPayload = tab.rows.map((row) => ({
        company_id: companyId,
        supplier_id: tab.supplier.id,
        date: row.date ? formatDateToYMD(row.date) : null,
        note: row.note || null,
        had_30: row.had_30 || 0,
        had_50: row.had_50 || 0,
        arrived_30: row.arrived_30 || 0,
        arrived_50: row.arrived_50 || 0,
        returned_30: row.returned_30 || 0,
        returned_50: row.returned_50 || 0,
        total_30: row.total_30 || 0,
        total_50: row.total_50 || 0,
      }));

      if (insertPayload.length > 0) {
        const { error: insertError } = await supabase
          .from("barrel_controls")
          .insert(insertPayload);

        if (insertError) {
          console.error(insertError);
          toast.error(`Erro ao salvar dados do fornecedor ${tab.supplier.name}`);
          return;
        }
      }
    }

    toast.success("Dados salvos com sucesso!");
    await fetchInitialData();
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const remainingTabs = tabs.filter((tab) => tab.supplier.id !== supplierId);

    const { error } = await supabase
      .from("barrel_controls")
      .delete()
      .eq("company_id", companyId)
      .eq("supplier_id", supplierId);

    if (error) {
      console.error(error);
      toast.error("Erro ao excluir dados do fornecedor.");
      return;
    }

    setTabs(remainingTabs);

    if (selectedTab === supplierId) {
      setSelectedTab(remainingTabs[0]?.supplier.id);
    }

    setShowConfirmDelete(false);
    setTabToDelete(null);
    toast.success("Fornecedor removido!");
  };

  function downloadCSV(filename: string, rows: BarrelEntry[]) {
    if (!rows.length) return;

    const headers = [
      "Data",
      "Nº Nota",
      "Tinha 30L",
      "Tinha 50L",
      "Chegou 30L",
      "Chegou 50L",
      "Devolvido 30L",
      "Devolvido 50L",
      "Total 30L",
      "Total 50L",
    ];

    const csvContent =
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          [
            row.date || "",
            row.note || "",
            row.had_30 || 0,
            row.had_50 || 0,
            row.arrived_30 || 0,
            row.arrived_50 || 0,
            row.returned_30 || 0,
            row.returned_50 || 0,
            row.total_30 || 0,
            row.total_50 || 0,
          ].join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-2 space-y-6 mt-9">
      <div className="relative ml-4">
        <h2 className="font-bold text-xl mb-4">Controle de Barril</h2>

        <Input
          value={searchSupplier}
          onChange={(e) => handleSearchSupplier(e.target.value)}
          placeholder="Buscar fornecedor..."
          className="w-64"
        />

        {searchSupplier && (
          <div className="absolute z-10 mt-1 w-64 rounded-md bg-background shadow border max-h-60 overflow-y-auto">
            {loadingSuppliers ? (
              <div className="p-2 text-center text-sm">Buscando...</div>
            ) : foundSuppliers.length > 0 ? (
              foundSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => handleAddSupplier(supplier)}
                  className="cursor-pointer px-4 py-2 hover:bg-muted"
                >
                  {supplier.name}
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-muted-foreground text-sm">
                Nenhum fornecedor encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {tabs.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-20 text-center text-muted-foreground mb-12 mx-4">
          Nenhum fornecedor adicionado ainda
        </div>
      )}

      {tabs.length > 0 && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="flex gap-2 ml-4">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.supplier.id}
                value={tab.supplier.id}
                className="flex items-center gap-2"
              >
                <span>{tab.supplier.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTabToDelete(tab.supplier.id);
                    setShowConfirmDelete(true);
                  }}
                  className="hover:text-destructive transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.supplier.id} value={tab.supplier.id}>
              <BarrelTable
                rows={tab.rows}
                setRows={(newRows) => {
                  setTabs((prevTabs) =>
                    prevTabs.map((t) =>
                      t.supplier.id === tab.supplier.id
                        ? { ...t, rows: newRows }
                        : t,
                    ),
                  );
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="flex justify-end mr-4 -mt-6">
        <Button onClick={handleSave}>Salvar Tudo</Button>
      </div>

      <div className="flex gap-2 justify-end mr-4 -mt-2">
        <Button
          onClick={() => {
            const currentTab = tabs.find((tab) => tab.supplier.id === selectedTab);
            if (currentTab) {
              downloadCSV(
                `controle-barris-${currentTab.supplier.name}.csv`,
                currentTab.rows,
              );
            }
          }}
          variant="outline"
          className="h-8 px-4 text-xs"
        >
          Exportar CSV
        </Button>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg space-y-4 w-[300px]">
            <h2 className="text-lg font-bold">Remover Fornecedor?</h2>
            <p className="text-sm text-muted-foreground">
              Essa ação irá excluir todas as linhas do fornecedor. Deseja continuar?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirmDelete(false);
                  setTabToDelete(null);
                }}
              >
                Cancelar
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  if (!tabToDelete) return;
                  await handleDeleteSupplier(tabToDelete);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}