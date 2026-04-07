"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

export type BarrelEntry = {
  id?: string;
  date: string;
  note: string;
  had_30: number;
  had_50: number;
  arrived_30: number;
  arrived_50: number;
  returned_30: number;
  returned_50: number;
  total_30: number;
  total_50: number;
};

export function BarrelTable({
  rows,
  setRows,
}: {
  rows: BarrelEntry[];
  setRows: (rows: BarrelEntry[]) => void;
}) {
  useEffect(() => {
    if (rows.length === 0) {
      setRows([
        {
          date: "",
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
      ]);
    }
  }, [rows, setRows]);

  const formatDate = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    return v;
  };

  const handleInputChange = (
    index: number,
    field: keyof BarrelEntry,
    value: string,
  ) => {
    const updated = [...rows];
    let finalValue: BarrelEntry[typeof field];

    if (field === "date") {
      finalValue = formatDate(value) as BarrelEntry[typeof field];
    } else if (field === "note") {
      finalValue = value as BarrelEntry[typeof field];
    } else {
      finalValue = (parseInt(value) || 0) as BarrelEntry[typeof field];
    }

    if (finalValue !== undefined) {
      (updated[index] as any)[field] = finalValue;
    }

    // Refaz a cascata de cálculos para todas as linhas
    for (let i = 0; i < updated.length; i++) {
        if (i > 0) {
            // O valor inicial (Tinha) de hoje é o Total do dia anterior
            updated[i].had_30 = updated[i-1].total_30 || 0;
            updated[i].had_50 = updated[i-1].total_50 || 0;
        }

        updated[i].total_30 =
          (updated[i].had_30 || 0) +
          (updated[i].arrived_30 || 0) -
          (updated[i].returned_30 || 0);

        updated[i].total_50 =
          (updated[i].had_50 || 0) +
          (updated[i].arrived_50 || 0) -
          (updated[i].returned_50 || 0);
    }

    setRows(updated);
  };

  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const confirmDeleteRow = (index: number) => {
    setRowToDelete(index);
  };

  const handleConfirmDelete = () => {
    if (rowToDelete === null) return;
    
    let updated = [...rows];
    updated.splice(rowToDelete, 1);
    
    if (updated.length === 0) {
      setRows([
        {
          date: getTodayDate(), note: "",
          had_30: 0, had_50: 0,
          arrived_30: 0, arrived_50: 0,
          returned_30: 0, returned_50: 0,
          total_30: 0, total_50: 0,
        },
      ]);
      setRowToDelete(null);
      return;
    }

    // Refaz cascata caso apague linha intermediária
    for (let i = 0; i < updated.length; i++) {
        if (i > 0) {
            updated[i].had_30 = updated[i-1].total_30 || 0;
            updated[i].had_50 = updated[i-1].total_50 || 0;
        }

        updated[i].total_30 = (updated[i].had_30 || 0) + (updated[i].arrived_30 || 0) - (updated[i].returned_30 || 0);
        updated[i].total_50 = (updated[i].had_50 || 0) + (updated[i].arrived_50 || 0) - (updated[i].returned_50 || 0);
    }

    setRows(updated);
    setRowToDelete(null);
  };

  const handleAddRow = () => {
    const lastEntry = rows[rows.length - 1];
    setRows([
      ...rows,
      {
        date: getTodayDate(),
        note: "",
        had_30: lastEntry ? lastEntry.total_30 : 0,
        had_50: lastEntry ? lastEntry.total_50 : 0,
        arrived_30: 0,
        arrived_50: 0,
        returned_30: 0,
        returned_50: 0,
        total_30: lastEntry ? lastEntry.total_30 : 0,
        total_50: lastEntry ? lastEntry.total_50 : 0,
      },
    ]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        {/* Header Action */}
        <div className="flex w-full items-center justify-between p-3 sm:p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-foreground/80 text-sm sm:text-base">Mapeamento</h3>
          <Button size="sm" onClick={handleAddRow} className="h-8 text-xs sm:text-sm">
            + Adicionar
          </Button>
        </div>

        {/* Scrollable Container for Mobile */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                {[
                  { key: "Data", w: "min-w-[95px]" },
                  { key: "Nº Nota", w: "min-w-[100px]" },
                  { key: "Tinha 30", w: "min-w-[70px]" },
                  { key: "Tinha 50", w: "min-w-[70px]" },
                  { key: "Chegou 30", w: "min-w-[85px]" },
                  { key: "Chegou 50", w: "min-w-[85px]" },
                  { key: "Dev. 30", w: "min-w-[75px]" },
                  { key: "Dev. 50", w: "min-w-[75px]" },
                  { key: "Total 30", w: "min-w-[75px]" },
                  { key: "Total 50", w: "min-w-[75px]" },
                  { key: "", w: "w-[40px]" },
                ].map((col, idx) => (
                  <th
                    key={idx}
                    className={`font-medium text-muted-foreground p-2 text-left align-middle ${col.w}`}
                  >
                    {col.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
            {rows.map((entry, index) => (
              <tr key={index}>
                {(
                  [
                    "date",
                    "note",
                    "had_30",
                    "had_50",
                    "arrived_30",
                    "arrived_50",
                    "returned_30",
                    "returned_50",
                    "total_30",
                    "total_50",
                  ] as (keyof BarrelEntry)[]
                ).map((field) => (
                  <td key={field} className="p-1 align-middle">
                    <Input
                      type={
                        field === "date" || field === "note" ? "text" : "number"
                      }
                      value={entry[field]}
                      readOnly={field === "total_30" || field === "total_50"}
                      onChange={(e) =>
                        handleInputChange(index, field, e.target.value)
                      }
                      className={`h-8 font-medium ${
                        field === "total_30" || field === "total_50" 
                          ? "bg-transparent border-transparent px-1 focus-visible:ring-0 text-foreground/80 cursor-default font-bold pointer-events-none" 
                          : "bg-background"
                      }`}
                      placeholder={field === "note" ? "—" : "0"}
                    />
                  </td>
                ))}
                <td className="p-1 px-2 text-center align-middle">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => confirmDeleteRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rowToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg space-y-4 w-[340px]">
            <h2 className="text-lg font-bold">Apagar Linha?</h2>
            <p className="text-sm text-muted-foreground">
              Você deseja realmente apagar essa linha? Isso não terá mais volta e poderá afetar o cálculo dos totais dos dias seguintes.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setRowToDelete(null)}
              >
                Cancelar
              </Button>

              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Sim, Apagar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
