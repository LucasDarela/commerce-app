import { NextResponse } from "next/server";
import { registerStockMovement } from "@/lib/stock/registerStockMovement";

function normalizeRequiredUuid(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} é obrigatório.`);
  }

  return value.trim();
}

function normalizeOptionalUuid(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function normalizeRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} inválido.`);
  }

  return parsed;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await registerStockMovement({
      companyId: normalizeRequiredUuid(body.companyId, "companyId"),
      productId: normalizeRequiredUuid(body.productId, "productId"),
      type: body.type,
      quantity: normalizeRequiredNumber(body.quantity, "quantity"),
      reason: typeof body.reason === "string" ? body.reason : "",
      noteId: normalizeOptionalUuid(body.noteId),
      createdBy: normalizeRequiredUuid(body.createdBy, "createdBy"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}