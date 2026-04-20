// app/api/nfe/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";

export async function POST(req: Request) {
  console.log("[NFe Webhook] Recebendo notificação...");

  try {
    const body = await req.json();
    console.log("[NFe Webhook] Body:", JSON.stringify(body, null, 2));

    const {
      referencia,
      status,
      numero,
      serie,
      chave_nfe,
      links,
      data_emissao,
      mensagem_sefaz,
    } = body;

    if (!referencia) {
      return NextResponse.json({ error: "Referência não informada" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[NFe Webhook] SUPABASE_URL ou SERVICE_ROLE não configurados");
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Buscar a nota pela referência
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, company_id, status")
      .eq("ref", referencia)
      .maybeSingle();

    if (fetchErr || !invoice) {
      console.warn("[NFe Webhook] Invoice não encontrada para ref:", referencia, fetchErr);
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    }

    // 2) Preparar atualização
    const payloadToUpdate: any = {
      status: status || invoice.status,
    };

    if (numero) payloadToUpdate.numero = numero;
    if (serie) payloadToUpdate.serie = serie;
    if (chave_nfe) payloadToUpdate.chave_nfe = chave_nfe;
    if (links?.xml) payloadToUpdate.xml_url = links.xml;
    if (links?.danfe) payloadToUpdate.danfe_url = links.danfe;
    if (data_emissao) payloadToUpdate.data_emissao = data_emissao;

    const { error: updateErr } = await supabase
      .from("invoices")
      .update(payloadToUpdate)
      .eq("id", invoice.id);

    if (updateErr) {
      console.error("[NFe Webhook] Erro ao atualizar nota:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    console.log(`[NFe Webhook] Nota ${referencia} atualizada para ${status}`);

    // 3) Trigger assíncrono para envio de e-mail se autorizada
    const isAuth = (status || "").toLowerCase().includes("autorizad");
    if (isAuth) {
      after(async () => {
        try {
          console.log("[NFe Webhook] Disparando check de e-mail...");
          await sendNfeEmailIfReady(invoice.id, invoice.company_id, supabase);
        } catch (e) {
          console.error("[NFe Webhook] Erro ao enviar e-mail pós-webhook:", e);
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[NFe Webhook] Erro interno:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
