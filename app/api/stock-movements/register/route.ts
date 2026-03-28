import { NextResponse } from "next/server";
import { registerStockMovement } from "@/lib/stock/registerStockMovement";

function normalizeRequiredUuid(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} é obrigatório.`);
  }

  return value;
}

function normalizeOptionalUuid(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function normalizeRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} inválido.`);
  }

  return parsed;
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    await registerStockMovement({
      companyId: normalizeRequiredUuid(body.companyId, "companyId"),
      productId: normalizeRequiredNumber(body.productId, "productId"),
      type: body.type,
      quantity: Number(body.quantity),
      reason: body.reason,
      noteId: normalizeOptionalUuid(body.noteId),
      createdBy: normalizeRequiredUuid(body.createdBy, "createdBy"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}