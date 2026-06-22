"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
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
  supplierName,
}: {
  rows: BarrelEntry[];
  setRows: (rows: BarrelEntry[]) => void;
  supplierName?: string;
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
        updated[i].had_30 = updated[i - 1].total_30 || 0;
        updated[i].had_50 = updated[i - 1].total_50 || 0;
      }

      updated[i].total_30 =
        (updated[i].had_30 || 0) -
        (updated[i].arrived_30 || 0) +
        (updated[i].returned_30 || 0);

      updated[i].total_50 =
        (updated[i].had_50 || 0) -
        (updated[i].arrived_50 || 0) +
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
      ]);
      setRowToDelete(null);
      return;
    }

    // Refaz cascata caso apague linha intermediária
    for (let i = 0; i < updated.length; i++) {
      if (i > 0) {
        updated[i].had_30 = updated[i - 1].total_30 || 0;
        updated[i].had_50 = updated[i - 1].total_50 || 0;
      }

      updated[i].total_30 =
        (updated[i].had_30 || 0) -
        (updated[i].arrived_30 || 0) +
        (updated[i].returned_30 || 0);
      updated[i].total_50 =
        (updated[i].had_50 || 0) -
        (updated[i].arrived_50 || 0) +
        (updated[i].returned_50 || 0);
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
    <div className="w-full space-y-6">
      <div className="flex w-full items-start sm:items-end justify-between flex-col sm:flex-row gap-4 px-1">
        <h3 
          className="font-bold text-xl sm:text-2xl text-foreground uppercase truncate max-w-[200px] sm:max-w-[400px]"
          title={supplierName || "Controle"}
        >
          {supplierName || "Controle"}
        </h3>

        <div className="border border-border/50 rounded-lg overflow-hidden bg-card shadow-sm text-center min-w-[220px]">
          <div className="bg-muted text-muted-foreground text-[11px] font-bold py-1.5 px-3 border-b border-border/50 uppercase tracking-wider">
            Saldo de Barril
          </div>
          <div className="grid grid-cols-2 divide-x divide-border/50 bg-background">
            <div className="flex flex-col items-center justify-center p-2">
              <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">
                50 Litros
              </div>
              <div className="font-bold text-lg leading-none text-foreground">
                {rows.length > 0 ? rows[rows.length - 1].total_50 : 0}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">
                30 Litros
              </div>
              <div
                className={`font-bold text-lg leading-none ${rows.length > 0 && rows[rows.length - 1].total_30 < 0 ? "text-destructive" : "text-foreground"}`}
              >
                {rows.length > 0 ? rows[rows.length - 1].total_30 : 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border/50 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs sm:text-sm min-w-[800px] border-collapse">
          <thead className="bg-muted/30 text-muted-foreground border-b border-border/40">
            <tr>
              <th
                rowSpan={2}
                className="p-3 text-center align-middle font-bold min-w-[95px] uppercase border-r border-border/30"
              >
                Data
              </th>
              <th
                rowSpan={2}
                className="p-3 text-center align-middle font-bold min-w-[120px] uppercase border-r border-border/30"
              >
                Observação
              </th>
              <th
                colSpan={4}
                className="p-2 text-center font-bold uppercase text-foreground/80 border-r border-border/30 bg-muted/20"
              >
                Barril 50 Litros
              </th>
              <th
                colSpan={4}
                className="p-2 text-center font-bold uppercase text-foreground/80 bg-muted/20"
              >
                Barril 30 Litros
              </th>
              <th
                rowSpan={2}
                className="p-3 w-[40px]"
              ></th>
            </tr>
            <tr className="text-muted-foreground text-[11px] border-t border-border/30">
              <th className="p-2 text-center font-semibold w-[70px] uppercase border-r border-border/30">
                Tinha
              </th>
              <th className="p-2 text-center font-semibold w-[80px] uppercase border-r border-border/30">
                Pedido
              </th>
              <th className="p-2 text-center font-semibold w-[80px] uppercase border-r border-border/30">
                Devolução
              </th>
              <th className="p-2 text-center font-semibold w-[70px] uppercase border-r border-border/30 bg-muted/20">
                Saldo
              </th>
              <th className="p-2 text-center font-semibold w-[70px] uppercase border-r border-border/30">
                Tinha
              </th>
              <th className="p-2 text-center font-semibold w-[80px] uppercase border-r border-border/30">
                Pedido
              </th>
              <th className="p-2 text-center font-semibold w-[80px] uppercase border-r border-border/30">
                Devolução
              </th>
              <th className="p-2 text-center font-semibold w-[70px] uppercase bg-muted/20">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
              {rows.map((entry, index) => (
                <tr
                  key={index}
                  className="hover:bg-muted/50 transition-colors group even:bg-muted/20 odd:bg-background"
                >
                  {(
                    [
                      "date",
                      "note",
                      "had_50",
                      "arrived_50",
                      "returned_50",
                      "total_50",
                      "had_30",
                      "arrived_30",
                      "returned_30",
                      "total_30",
                    ] as (keyof BarrelEntry)[]
                  ).map((field) => (
                    <td
                      key={field}
                      className={`p-0 align-middle ${(field === "total_50" || field === "date" || field === "note" || field === "returned_50" || field === "arrived_50" || field === "had_50" || field === "total_30" || field === "returned_30" || field === "arrived_30" || field === "had_30") && field !== "total_30" ? "border-r border-border/30" : ""} ${field === "total_30" || field === "total_50" ? "bg-muted/30" : ""}`}
                    >
                      <Input
                        type={
                          field === "date" || field === "note"
                            ? "text"
                            : "number"
                        }
                        value={entry[field]}
                        readOnly={field === "total_30" || field === "total_50"}
                        onChange={(e) =>
                          handleInputChange(index, field, e.target.value)
                        }
                        className={`h-11 font-medium border-0 rounded-none w-full text-center focus-visible:ring-1 focus-visible:ring-primary shadow-none ${
                          field === "total_30" || field === "total_50"
                            ? "bg-transparent text-foreground font-bold pointer-events-none"
                            : "bg-transparent hover:bg-muted/30"
                        } ${field === "note" ? "text-left px-3" : ""}`}
                        placeholder={field === "note" ? "" : "0"}
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center align-middle">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
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
      </div>

        {rowToDelete !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg space-y-4 w-[340px]">
              <h2 className="text-lg font-bold">Apagar Linha?</h2>
              <p className="text-sm text-muted-foreground">
                Você deseja realmente apagar essa linha? Isso não terá mais
                volta e poderá afetar o cálculo dos totais dos dias seguintes.
              </p>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setRowToDelete(null)}
                >
                  Cancelar
                </Button>

                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Sim, Apagar
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
