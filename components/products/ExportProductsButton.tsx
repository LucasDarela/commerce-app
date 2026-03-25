"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ProductExportRow = {
  code: string | number | null;
  name: string | null;
  stock: number | null;
  standard_price: number | string | null;
  material_class: string | null;
};

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generatePDF(data: ProductExportRow[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Lista de Produtos", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["Código", "Nome", "Estoque", "Classe", "Valor (R$)"]],
    body: data.map((item) => [
      String(item.code ?? ""),
      String(item.name ?? ""),
      String(item.stock ?? 0),
      String(item.material_class ?? ""),
      Number(item.standard_price ?? 0).toFixed(2),
    ]),
  });

  doc.save("produtos.pdf");
}

function generateXML(data: ProductExportRow[]) {
  const xmlItems = data
    .map(
      (item) => `
  <produto>
    <codigo>${escapeXml(item.code)}</codigo>
    <nome>${escapeXml(item.name)}</nome>
    <estoque>${escapeXml(item.stock ?? 0)}</estoque>
    <classe>${escapeXml(item.material_class)}</classe>
    <valor>${escapeXml(item.standard_price ?? 0)}</valor>
  </produto>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<produtos>${xmlItems}
</produtos>`;
}

export function ExportProductsButton() {
  const supabase = createBrowserSupabaseClient();     
  const { companyId, loading } = useAuthenticatedCompany();
  const [exporting, setExporting] = useState<"pdf" | "xml" | null>(null);

  const onExport = async (type: "pdf" | "xml") => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    setExporting(type);

    try {
      const { data, error } = await supabase
        .from("products")
        .select("code, name, stock, standard_price, material_class")
        .eq("company_id", companyId)
        .order("code", { ascending: true });

      if (error || !data) {
        toast.error("Erro ao buscar produtos");
        return;
      }

      const rows = data as ProductExportRow[];

      if (type === "pdf") {
        generatePDF(rows);
        return;
      }

      const xml = generateXML(rows);
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "produtos.xml";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar produtos:", error);
      toast.error("Erro inesperado ao exportar produtos.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={loading || !companyId}>
          Exportar Produtos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escolha o formato</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex justify-center gap-4">
          <Button
            onClick={() => onExport("pdf")}
            className="w-[80px]"
            variant="default"
            disabled={loading || !companyId || exporting !== null}
          >
            {exporting === "pdf" ? "..." : "PDF"}
          </Button>

          <Button
            onClick={() => onExport("xml")}
            className="w-[80px]"
            variant="secondary"
            disabled={loading || !companyId || exporting !== null}
          >
            {exporting === "xml" ? "..." : "XML"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}