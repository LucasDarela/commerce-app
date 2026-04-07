"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarrelTable, BarrelEntry } from "./barrel-table";
import { Search, Save, Download } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  isAvulso?: boolean;
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  function formatDateFromDB(dateString: string) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatDateToYMD(dateStr: string) {
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year || year.length < 4) return null;
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

    const loadedTabs = Object.values(suppliersMap).sort((a, b) => 
      a.supplier.name.localeCompare(b.supplier.name)
    );
    setTabs(loadedTabs);
    setSelectedTab((prev) => prev ?? loadedTabs[0]?.supplier.id);
    setTimeout(() => setIsInitialLoad(false), 500);
  };

  useEffect(() => {
    fetchInitialData();
  }, [companyId]);

  useEffect(() => {
    if (isInitialLoad || tabs.length === 0) return;
    const timeoutId = setTimeout(() => {
      handleSave(true);
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [tabs, isInitialLoad]);

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

    setTabs((prev) => {
      const nextTabs = [
        ...prev,
        {
          supplier,
          rows: [
            {
              date: getTodayDate(),
              note: "",
              had_30: 0,
              had_50: 0,
              arrived_30: 0,
              arrived_50: 0,
              returned_30: 0,
              returned_50: 0,
              total_30: 0,
              total_50: 0,
            },
          ],
        },
      ];
      return nextTabs.sort((a, b) => a.supplier.name.localeCompare(b.supplier.name));
    });
    setSelectedTab(supplier.id);
    setSearchSupplier("");
    setFoundSuppliers([]);
  };

  const handleSave = async (silent: boolean | React.MouseEvent<HTMLButtonElement> = false) => {
    if (!companyId) {
      if (silent !== true) toast.error("Empresa não identificada.");
      return;
    }

    for (const tab of tabs) {
      if (tab.supplier.isAvulso) {
        // Geração de um "documento" falso (14 dígitos) para evitar colisão Unique ou máscara
        const fakeDocument = String(Math.floor(Math.random() * 89999999999999) + 10000000000000);
        
        const { error: sErr } = await supabase.from("suppliers").insert({
          id: tab.supplier.id,
          company_id: companyId,
          name: tab.supplier.name,
          type: "CNPJ",
          document: fakeDocument,
        });
        
        if (sErr) {
            console.error("Erro banco:", sErr.message, sErr.details, sErr.hint, sErr.code);
            if (silent !== true) toast.error(`Falha no banco ao salvar aba avulsa: ${sErr.message}`);
        }
        
        tab.supplier.isAvulso = false; // evitar re-inserção
      }

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

      const validRows = tab.rows.filter(r => r.date && formatDateToYMD(r.date) !== null);

      const insertPayload = validRows.map((row) => ({
        company_id: companyId,
        supplier_id: tab.supplier.id,
        date: formatDateToYMD(row.date),
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
          if (silent !== true) toast.error(`Erro ao salvar dados do fornecedor ${tab.supplier.name}`);
          return;
        }
      }
    }

    if (silent !== true) {
      toast.success("Dados salvos com sucesso!");
      await fetchInitialData();
    }
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
    <div className="w-full @container px-2 space-y-6 mt-9">
      <div className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Mapeamento de Barris</h2>
            <p className="text-sm text-muted-foreground">
              Controle de vasilhames e comodatos com fornecedores
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchSupplier}
              onChange={(e) => handleSearchSupplier(e.target.value)}
              placeholder="Buscar ou criar aba..."
              className="pl-9 w-full"
            />

            {searchSupplier && (
              <div className="absolute z-20 mt-1 w-full rounded-md bg-background shadow-lg border max-h-60 overflow-y-auto custom-scrollbar">
                {loadingSuppliers ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
                ) : foundSuppliers.length > 0 ? (
                  <>
                    {foundSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        onClick={() => handleAddSupplier(supplier)}
                        className="cursor-pointer px-4 py-3 hover:bg-muted border-b last:border-0 transition-colors"
                      >
                        {supplier.name}
                      </div>
                    ))}
                    <div
                      onClick={() => handleAddSupplier({ id: crypto.randomUUID(), name: searchSupplier, isAvulso: true })}
                      className="cursor-pointer px-4 py-3 hover:bg-muted text-primary text-sm font-medium border-t bg-muted/30 transition-colors"
                    >
                      + Criar aba avulsa "{searchSupplier}"
                    </div>
                  </>
                ) : (
                  <div 
                    className="p-3 text-center text-primary text-sm cursor-pointer hover:bg-muted transition-colors font-medium"
                    onClick={() => handleAddSupplier({ id: crypto.randomUUID(), name: searchSupplier, isAvulso: true })}
                  >
                    + Criar aba avulsa "{searchSupplier}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-6">
          {tabs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-muted p-12 sm:p-20 text-center text-muted-foreground my-8 hover:bg-muted/10 transition-colors cursor-default">
              <p className="text-lg font-medium mb-1">Nenhum fornecedor monitorado</p>
              <p className="text-sm">Use o campo de busca acima para adicionar uma aba</p>
            </div>
          )}

          {tabs.length > 0 && (
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <ScrollArea className="w-full mb-4">
                <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max sm:w-auto overflow-x-auto whitespace-nowrap mb-2 custom-scrollbar">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.supplier.id}
                      value={tab.supplier.id}
                      className="flex items-center gap-2 group data-[state=active]:shadow-sm"
                    >
                      <span>{tab.supplier.name}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setTabToDelete(tab.supplier.id);
                          setShowConfirmDelete(true);
                        }}
                        className="text-muted-foreground/50 hover:text-destructive group-hover:text-muted-foreground transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {tabs.map((tab) => (
                <TabsContent key={tab.supplier.id} value={tab.supplier.id} className="mt-0 outline-none">
                  <div className="w-full overflow-hidden">
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
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {tabs.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 w-full border-t border-muted/50 mt-4">
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
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          )}
        </div>
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