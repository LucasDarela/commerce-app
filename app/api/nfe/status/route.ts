// app/api/nfe/status/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { fetchInvoiceStatus } from "@/lib/focus-nfe/fetchInvoiceStatus"; // você irá criar esse helper

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { ref } = await req.json();

  if (!ref) {
    return NextResponse.json({ error: "ref obrigatório" }, { status: 400 });
  }

  const { data, error } = await fetchInvoiceStatus(ref);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  // Atualiza nota no Supabase
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: data.status,
      numero: data.numero,
      serie: data.serie,
      chave_nfe: data.chave,
      xml_url: data.xml_url,
      danfe_url: data.danfe_url,
      data_emissao: data.data_emissao,
    })
    .eq("ref", ref);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data });
}
