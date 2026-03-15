import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Mercado Pago desativado. Use Asaas para gerar cobranças.",
    },
    { status: 410 }, // Gone
  );
}
