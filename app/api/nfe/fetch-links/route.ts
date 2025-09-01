// app/api/nfe/fetch-links/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus";
import { fetchAndStoreNfeFiles } from "@/lib/focus-nfe/fetchAndStoreNfeFiles";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
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
        data_emissao: toIso(d.data_emissao) ?? null,
        status: d.status ?? null,
      })
      .eq("ref", ref)
      .eq("company_id", companyId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
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
