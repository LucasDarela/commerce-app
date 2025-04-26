"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BoletoPDF } from "@/components/pdf/boleto-pdf"; 
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver"; 
import { useRouter } from "next/navigation";

interface GenerateBoletoButtonProps {
  orderId: string;
  paymentMethod: string;
  signatureData: string;
}

export function GenerateBoletoButton({ orderId, paymentMethod, signatureData }: GenerateBoletoButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerateBoleto = async () => {
    try {
      setLoading(true);

      const { data: order } = await supabase
        .from("orders")
        .select(`
          *,
          customers:customers(*)
        `)
        .eq("id", orderId)
        .single();

      if (!order || !order.customers) {
        toast.error("⚠️ Dados do cliente não encontrados.");
        return;
      }

      const cliente = order.customers;

      const payload = {
        nome: cliente.name,
        document: cliente.document,
        email: cliente.email,
        total: order.total,
        days_ticket: order.days_ticket,
        order_id: order.id,
        zip_code: cliente.zip_code,
        address: cliente.address,
        number: cliente.number,
        neighborhood: cliente.neighborhood,
        city: cliente.city,
        state: cliente.state,
      };

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result?.error === "Access Token não configurado") {
          toast.error("⚠️ Integração com Mercado Pago não configurada.");
        } else if (result?.error === "Erro ao gerar boleto") {
          toast.error(`❌ Erro ao gerar boleto: ${result.details?.message || "Erro desconhecido."}`);
        } else {
          toast.error("❌ Erro inesperado ao gerar boleto.");
        }
        console.error("Erro:", result);
        return;
      }

      toast.success("🎉 Boleto gerado com sucesso!");

      const deliveryDate = new Date();
      const vencimento = new Date(deliveryDate.setDate(deliveryDate.getDate() + parseInt(order.days_ticket || "12")));
      const vencimentoStr = vencimento.toLocaleDateString("pt-BR");
  

      // Agora gerar o PDF local usando o signatureData
      const pdfBlob = await pdf(
        <BoletoPDF 
        order={order} 
        signatureData={signatureData} 
        vencimentoStr={vencimentoStr} 
      />
      ).toBlob();

      saveAs(pdfBlob, `boleto-pedido-${order.note_number}.pdf`);

    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toast.error("❌ Erro inesperado ao gerar boleto.");
    } finally {
      setLoading(false);
    }
  };

  if (!paymentMethod || paymentMethod.toLowerCase() !== "boleto") {
    return null;
  }

  return (
    <Button onClick={handleGenerateBoleto} disabled={loading}>
      {loading ? "Gerando Boleto..." : "Gerar Boleto"}
    </Button>
  );
}