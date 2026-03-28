"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function generatePDF(data: any[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Lista de Equipamentos", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["Código", "Nome", "Estoque", "Valor (R$)", "Disponível"]],
    body: data.map((item) => [
      item.code,
      item.name,
      item.stock,
      Number(item.value).toFixed(2),
      item.is_available,
    ]),
  });

  doc.save("equipamentos.pdf");
}

function generateXML(data: any[]) {
  const xmlItems = data
    .map(
      (item) => `
  <equipamento>
    <codigo>${item.code}</codigo>
    <nome>${item.name}</nome>
    <estoque>${item.stock}</estoque>
    <valor>${item.value}</valor>
    <disponivel>${item.is_available}</disponivel>
  </equipamento>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><equipments>${xmlItems}</equipments>`;
}

export function ExportEquipmentsButton({
  companyId,
}: {
  companyId: string;
}) {
  const supabase = createBrowserSupabaseClient();     
  const [loading, setLoading] = useState(false);

  const onExport = async (type: "pdf" | "xml") => {
    if (loading) return;

    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("equipments")
        .select("code, name, stock, value, is_available")
        .eq("company_id", companyId)
        .order("code", { ascending: true });

      if (error || !data) {
        console.error(error);
        toast.error("Erro ao buscar equipamentos");
        return;
      }

      const formatted = data.map((item) => ({
        ...item,
        is_available: item.is_available ? "Sim" : "Não",
      }));

      if (type === "pdf") {
        generatePDF(formatted);
      } else {
        const xml = generateXML(formatted);
        const blob = new Blob([xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "equipamentos.xml";
        link.click();

        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={loading}>
          {loading ? "Exportando..." : "Exportar Equipamentos"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escolha o formato</DialogTitle>
          <DialogDescription>
            Escolha o formato desejado para exportar os equipamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-4 mt-4">
          <Button
            onClick={() => onExport("pdf")}
            className="w-[80px]"
            disabled={loading}
          >
            PDF
          </Button>

          <Button
            onClick={() => onExport("xml")}
            className="w-[80px]"
            variant="secondary"
            disabled={loading}
          >
            XML
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}