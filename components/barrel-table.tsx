"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";

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

  const handleInputChange = (index: number, field: keyof BarrelEntry, value: string) => {
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
  
    if (["arrived_30", "returned_30", "had_30"].includes(field)) {
      updated[index].total_30 =
        (updated[index].had_30 || 0) +
        (updated[index].arrived_30 || 0) -
        (updated[index].returned_30 || 0);
    }
  
    if (["arrived_50", "returned_50", "had_50"].includes(field)) {
      updated[index].total_50 =
        (updated[index].had_50 || 0) +
        (updated[index].arrived_50 || 0) -
        (updated[index].returned_50 || 0);
    }
  
    setRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated.length > 0 ? updated : [
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
      }
    ]);
  };

  const handleAddRow = () => {
    const lastEntry = rows[rows.length - 1];
    setRows([
      ...rows,
      {
        date: "",
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
    <div className="p-4 space-y-4">
            <div className="flex w-full">
      <Button className="" onClick={handleAddRow}>
            + Nova Linha
      </Button>
      </div>
      <div className="overflow-auto rounded-lg border shadow-md">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {["Data", "Nº Nota", "Tinha 30L", "Tinha 50L", "Chegou 30L", "Chegou 50L", "Devolvido 30L", "Devolvido 50L", "Total 30L", "Total 50L", ""].map((header) => (
                <th key={header} className="border p-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, index) => (
              <tr key={index}>
                {(["date", "note", "had_30", "had_50", "arrived_30", "arrived_50", "returned_30", "returned_50", "total_30", "total_50"] as (keyof BarrelEntry)[]).map((field) => (
                  <td key={field} className="border p-1">
                    <Input
                      type={field === "date" || field === "note" ? "text" : "number"}
                      value={entry[field]}
                      onChange={(e) => handleInputChange(index, field, e.target.value)}
                      className="h-8"
                    />
                  </td>
                ))}
                <td className="border p-1 text-center">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}