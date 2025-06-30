"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function generatePDF(data: any[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Lista de Produtos", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["Código", "Nome", "Estoque", "Classe", "Valor (R$)"]],
    body: data.map((item) => [
      item.code,
      item.name,
      item.stock,
      item.material_class,
      Number(item.standard_price).toFixed(2),
    ]),
  });

  doc.save("produtos.pdf");
}

function generateXML(data: any[]) {
  const xmlItems = data
    .map(
      (item) => `
  <produtos>
    <codigo>${item.code}</codigo>
    <nome>${item.name}</nome>
    <estoque>${item.stock}</estoque>
    <classe>${item.material_class}</classe>
    <valor>${item.standard_price}</valor>
  </produtos>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><produtos>${xmlItems}</produtos>`;
}

export function ExportProductsButton() {
  const onExport = async (type: "pdf" | "xml") => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
      code, name, stock, standard_price, material_class
    `,
      )
      .order("code", { ascending: true });

    if (error || !data) {
      toast.error("Erro ao buscar produtos");
      return;
    }

    if (type === "pdf") {
      generatePDF(data);
    } else {
      const xml = generateXML(data);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "produtos.xml";
      link.click();

      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Exportar Produtos</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escolha o formato</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-4 mt-4">
          <Button
            onClick={() => onExport("pdf")}
            className="w-[80px]"
            variant="default"
          >
            PDF
          </Button>
          <Button
            onClick={() => onExport("xml")}
            className="w-[80px]"
            variant="secondary"
          >
            XML
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
