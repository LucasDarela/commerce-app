// "use client";

// import { useState } from "react";
// import { supabase } from "@/lib/supabase";
// import { Button } from "@/components/ui/button";
// import { toast } from "sonner";
// import { BoletoPDF } from "@/components/pdf/boleto-pdf";
// import { pdf } from "@react-pdf/renderer";
// import { saveAs } from "file-saver";
// import { useRouter } from "next/navigation";

// interface GenerateBoletoButtonProps {
//   orderId: string;
//   paymentMethod: string;
//   signatureData: string;
// }

// export function GenerateBoletoButton({
//   orderId,
//   paymentMethod,
//   signatureData,
// }: GenerateBoletoButtonProps) {
//   const [loading, setLoading] = useState(false);
//   const router = useRouter();

//   const handleGenerateBoleto = async () => {
//     try {
//       setLoading(true);

//       const { data: order } = await supabase
//         .from("orders")
//         .select(`*, customers:customers(*)`)
//         .eq("id", orderId)
//         .single();

//       if (!order || !order.customers) {
//         toast.error("⚠️ Dados do cliente não encontrados.");
//         return;
//       }

//       // ✅ Se já existe, apenas abrir
//       if (order.boleto_url) {
//         toast.success("✅ Boleto já gerado.");
//         window.location.href = order.boleto_url;
//         return;
//       }

//       const cliente = order.customers;

//       const payload = {
//         nome: cliente.name,
//         document: cliente.document,
//         email: cliente.email,
//         total: order.total,
//         days_ticket: order.days_ticket,
//         order_id: order.id,
//         zip_code: cliente.zip_code,
//         address: cliente.address,
//         number: cliente.number,
//         neighborhood: cliente.neighborhood,
//         city: cliente.city,
//         state: cliente.state,
//         phone: cliente.phone,
//       };

//       // ✅ Agora sim: criar boleto
//       const res = await fetch("/api/create-payment", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const result = await res.json();

//       if (!res.ok) {
//         if (result?.error === "Access Token não configurado") {
//           toast.error("⚠️ Integração com Mercado Pago não configurada.");
//         } else if (result?.error === "Erro ao gerar boleto") {
//           toast.error(
//             `❌ Erro ao gerar boleto: ${result.details?.message || "Erro desconhecido."}`,
//           );
//         } else {
//           toast.error("❌ Erro inesperado ao gerar boleto.");
//         }
//         console.error("Erro:", result);
//         return;
//       }

//       // ✅ Buscar boleto atualizado no Supabase
//       const { data: updatedOrder, error: fetchError } = await supabase
//         .from("orders")
//         .select("boleto_url")
//         .eq("id", order.id)
//         .single();

//       if (fetchError || !updatedOrder?.boleto_url) {
//         toast.error("❌ Boleto gerado mas não encontrado no Supabase.");
//         return;
//       }

//       toast.success("🎉 Boleto gerado com sucesso!");
//       window.open(updatedOrder.boleto_url, "_blank");
//     } catch (error) {
//       console.error("❌ Erro inesperado:", error);
//       toast.error("❌ Erro inesperado ao gerar boleto.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!paymentMethod || paymentMethod.toLowerCase() !== "boleto") {
//     return null;
//   }

//   return (
//     <Button onClick={handleGenerateBoleto} disabled={loading}>
//       {loading ? "Gerando Boleto..." : "Gerar Boleto"}
//     </Button>
//   );
// }
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function formatYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function openBoleto(url: string) {
  if (!url) return;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // abre na mesma aba (mais confiável em mobile/PWA)
    window.location.href = url;
  } else {
    // desktop: nova aba
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

type Provider = "asaas" | "mercado_pago" | null;

export function GenerateBoletoButtons({
  orderId,
  paymentMethod,
  signatureData,
}: {
  orderId: string;
  paymentMethod: string;
  signatureData: string;
}) {
  const supabase = createClientComponentClient();
  const [provider, setProvider] = useState<Provider>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // company atual
        const { data: comp } = await supabase
          .from("current_user_company_id")
          .select("company_id")
          .maybeSingle();
        if (!comp?.company_id) {
          setProvider(null);
          return;
        }
        // integrações ativas (se tiver coluna 'access_token', já filtra as válidas)
        const { data } = await supabase
          .from("company_integrations")
          .select("provider, access_token")
          .eq("company_id", comp.company_id);

        const providers = (data ?? [])
          .filter((r) => !!r.access_token)
          .map((r) => r.provider as string);

        // prioridade: Asaas > MP
        if (providers.includes("asaas")) setProvider("asaas");
        else if (providers.includes("mercado_pago"))
          setProvider("mercado_pago");
        else setProvider(null);
      } finally {
        setChecking(false);
      }
    })();
  }, [supabase]);

  if (checking) return null;
  if (!paymentMethod || paymentMethod.toLowerCase() !== "boleto") return null;
  if (!provider) return null;

  if (provider === "asaas") {
    return (
      <GenerateBoletoAsaasButton
        orderId={orderId}
        paymentMethod={paymentMethod}
      />
    );
  }
  // fallback: MP
  return (
    <GenerateBoletoMPButton
      orderId={orderId}
      paymentMethod={paymentMethod}
      signatureData={signatureData}
    />
  );
}

/** === Mercado Pago === */
function GenerateBoletoMPButton({
  orderId,
  paymentMethod,
  signatureData,
}: {
  orderId: string;
  paymentMethod: string;
  signatureData: string;
}) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  const handleGenerateBoleto = async () => {
    try {
      setLoading(true);
      const { data: order } = await supabase
        .from("orders")
        .select(`*, customers:customers(*)`)
        .eq("id", orderId)
        .single();

      if (!order || !order.customers) {
        toast.error("⚠️ Dados do cliente não encontrados.");
        return;
      }

      if (order.boleto_url) {
        toast.success("✅ Boleto já gerado.");
        openBoleto(order.boleto_url);
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
        phone: cliente.phone,
        signatureData,
      };

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        if (result?.error?.includes("Access Token")) {
          toast.error("⚠️ Integração com Mercado Pago não configurada.");
        } else {
          toast.error(result?.error || "❌ Erro ao gerar boleto (MP).");
        }
        console.error("Erro MP:", result);
        return;
      }

      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("boleto_url")
        .eq("id", order.id)
        .single();

      if (!updatedOrder?.boleto_url) {
        toast.error("❌ Boleto gerado mas não encontrado no Supabase.");
        return;
      }

      toast.success("🎉 Boleto (Mercado Pago) gerado!");
      openBoleto(updatedOrder.boleto_url);
    } catch (e: any) {
      console.error("❌ MP:", e);
      toast.error(e?.message || "Erro inesperado (MP).");
    } finally {
      setLoading(false);
    }
  };

  if (!paymentMethod || paymentMethod.toLowerCase() !== "boleto") return null;

  return (
    <Button onClick={handleGenerateBoleto} disabled={loading} variant="default">
      {loading ? "Gerando Boleto (MP)..." : "Gerar Boleto (Mercado Pago)"}
    </Button>
  );
}

/** === Asaas === */
function GenerateBoletoAsaasButton({
  orderId,
  paymentMethod,
}: {
  orderId: string;
  paymentMethod: string;
}) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  const handleGenerateBoletoAsaas = async () => {
    try {
      setLoading(true);

      const { data: order, error } = await supabase
        .from("orders")
        .select(`*, customers:customers(*)`)
        .eq("id", orderId)
        .single();
      if (error || !order || !order.customers) {
        toast.error("⚠️ Dados do cliente não encontrados.");
        return;
      }

      if (order.boleto_url) {
        toast.success("✅ Boleto já gerado.");
        openBoleto(order.boleto_url);
        return;
      }

      const cliente = order.customers;
      const days =
        typeof order.days_ticket === "number" ? order.days_ticket : 0;
      const dueDate = formatYMD(addDays(new Date(), days));
      const value = Number(order.total || 0);

      const res = await fetch("/api/asaas/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          customerId: cliente.id, // uuid do customers
          value,
          dueDate,
          description: `Pedido #${order.note_number}`,
        }),
      });
      const json = await res.json();
      console.log("🔎 Asaas /payments/create:", json);

      if (!res.ok) {
        toast.error(json.error || "Falha ao criar boleto (Asaas)");
        return;
      }

      // opcional: manter a URL no pedido para reabrir depois
      if (json.boletoUrl) {
        await supabase
          .from("orders")
          .update({ boleto_url: json.boletoUrl })
          .eq("id", orderId);
      }

      toast.success("🎉 Boleto (Asaas) gerado!");
      if (json.boletoUrl) openBoleto(json.boletoUrl);
    } catch (e: any) {
      console.error("❌ Asaas:", e);
      toast.error(e?.message || "Erro ao criar boleto (Asaas)");
    } finally {
      setLoading(false);
    }
  };

  if (!paymentMethod || paymentMethod.toLowerCase() !== "boleto") return null;

  return (
    <Button
      onClick={handleGenerateBoletoAsaas}
      disabled={loading}
      variant="default"
    >
      {loading ? "Gerando Boleto (Asaas)..." : "Gerar Boleto (Asaas)"}
    </Button>
  );
}
