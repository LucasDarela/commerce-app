import { NextResponse } from "next/server";
import { fetchAndStoreNfeFiles } from "@/lib/focus-nfe/fetchAndStoreNfeFiles";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ref, invoiceId, companyId } = body;

    if (!ref || !invoiceId || !companyId) {
      return NextResponse.json(
        { error: "ref, invoiceId e companyId são obrigatórios" },
        { status: 400 },
      );
    }

    const result = await fetchAndStoreNfeFiles(ref, invoiceId, companyId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xmlUrl: result.xmlUrl,
      danfeUrl: result.pdfUrl,
    });
  } catch (error: any) {
    console.error("Erro na rota /api/nfe/fetch-files:", error.message);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
