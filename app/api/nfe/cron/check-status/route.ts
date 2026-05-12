// app/api/nfe/cron/check-status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";
import { fetchAndStoreNfeFiles } from "@/lib/focus-nfe/fetchAndStoreNfeFiles";

/**
 * Zelador da NF-e: Unifica busca de status e busca de arquivos/links.
 * Roda a cada 1 minuto para garantir que nada fique preso.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[NFe Caretaker] Iniciando ronda periódica...");

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Configuração do Supabase incompleta");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const results = {
      statusUpdated: 0,
      filesDownloaded: 0,
      emailsSent: 0,
    };

    // --- PARTE 1: Atualizar Status de Notas Pendentes ---
    const { data: pendingStatus } = await supabase
      .from("invoices")
      .select("*")
      .eq("status", "processando_autorizacao")
      .limit(10);

    if (pendingStatus && pendingStatus.length > 0) {
      for (const inv of pendingStatus) {
        const res = await fetchInvoiceStatus({
          supabase,
          companyId: inv.company_id,
          ref: inv.ref,
        });
        if (!("error" in res) && res.data) {
          const payloadToUpdate: any = { status: res.data.status };
          if (res.data.numero) payloadToUpdate.numero = res.data.numero;
          if (res.data.serie) payloadToUpdate.serie = res.data.serie;
          if (res.data.chave) payloadToUpdate.chave_nfe = res.data.chave;
          if (res.data.xml_url) payloadToUpdate.xml_url = res.data.xml_url;
          if (res.data.danfe_url)
            payloadToUpdate.danfe_url = res.data.danfe_url;
          if (res.data.data_emissao)
            payloadToUpdate.data_emissao = res.data.data_emissao;

          const { error: updateErr } = await supabase
            .from("invoices")
            .update(payloadToUpdate)
            .eq("id", inv.id);

          if (!updateErr) {
            results.statusUpdated++;
            const isAuth = (res.data.status ?? "")
              .toLowerCase()
              .includes("autorizad");
            if (isAuth) {
              await sendNfeEmailIfReady(inv.id, inv.company_id, supabase).catch(
                () => null,
              );
              results.emailsSent++;
            }
          }
        }
      }
    }

    // --- PARTE 2: Buscar Links/Arquivos de Notas Autorizadas sem PDF/XML ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: pendingFiles } = await supabase
      .from("invoices")
      .select("id, ref, company_id, status")
      .ilike("status", "%autorizad%")
      .or("danfe_url.is.null,xml_url.is.null")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(10);

    if (pendingFiles && pendingFiles.length > 0) {
      for (const inv of pendingFiles) {
        const stored = await fetchAndStoreNfeFiles(
          inv.ref,
          inv.id,
          inv.company_id,
        );
        if (stored.success) {
          results.filesDownloaded++;
          // Tentar enviar e-mail
          await sendNfeEmailIfReady(inv.id, inv.company_id, supabase).catch(
            () => null,
          );
          results.emailsSent++;
        }
      }
    }

    console.log("[NFe Caretaker] Ciclo concluído:", results);
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("[NFe Caretaker] Erro fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
