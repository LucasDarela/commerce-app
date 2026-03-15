import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Webhook Mercado Pago desativado, use o ASAAS" },
    { status: 410 },
  );
}
