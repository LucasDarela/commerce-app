// app/api/nfe/fetch-links/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";
import { fetchAndStoreNfeFiles } from "@/lib/focus-nfe/fetchAndStoreNfeFiles";
import { sendNfeEmailIfReady } from "@/lib/nfe/sendNfeEmail";

async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // sem alterar comportamento
          }
        },
      },
    },
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteClient();

  const toIso = (s?: string | null) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  try {
    const { ref, companyId, invoiceId } = await req.json();

    if (!ref || !companyId) {
      return NextResponse.json(
        { error: "Parâmetros 'ref' e 'companyId' são obrigatórios." },
        { status: 400 },
      );
    }

    const res = await fetchInvoiceStatus({
      supabase,
      companyId,
      ref,
      poll: 6,
      intervalMs: 2000,
    });

    if ("error" in res) {
      return NextResponse.json(
        {
          error: res.error,
          mensagem_sefaz: res.mensagem_sefaz ?? null,
        },
        { status: 502 },
      );
    }

    let d = res.data ?? {};

    const isAuth = (d.status || "").toLowerCase().includes("autorizad");

    if (isAuth && (!d.xml_url || !d.danfe_url) && invoiceId) {
      const stored = await fetchAndStoreNfeFiles(ref, invoiceId, companyId);

      if (stored.success) {
        d = {
          ...d,
          xml_url: stored.xmlUrl ?? d.xml_url ?? null,
          danfe_url: stored.pdfUrl ?? d.danfe_url ?? null,
        };
      }
    }

    if (!d) {
      return NextResponse.json(
        { error: "Sem dados retornados da Focus para esta referência." },
        { status: 502 },
      );
    }

    const { error: upErr } = await supabase
      .from("invoices")
      .update({
        numero: d.numero ?? null,
        serie: d.serie ?? null,
        chave_nfe: d.chave ?? null,
        xml_url: d.xml_url ?? null,
        danfe_url: d.danfe_url ?? null,
        // Só atualiza data_emissao se a Focus retornou um valor válido;
        // caso contrário preserva o que já está no banco.
        ...(toIso(d.data_emissao) ? { data_emissao: toIso(d.data_emissao) } : {}),
        status: d.status ?? null,
      })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // Dispara o envio do email de forma assíncrona após atualizar os links
    if (invoiceId && isAuth) {
      const companyIdForEmail = companyId as string;
      sendNfeEmailIfReady(invoiceId, companyIdForEmail, supabase).catch(
        (err) => console.error("[fetch-links] Erro ao enviar email NF-e:", err),
      );
    }

    return NextResponse.json({
      success: true,
      data: d,
      mensagem_sefaz: res.mensagem_sefaz ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro interno" },
      { status: 500 },
    );
  }
}