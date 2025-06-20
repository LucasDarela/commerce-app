import { NextResponse } from "next/server";
import { registerStockMovement } from "@/lib/stock/registerStockMovement";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    await registerStockMovement({
      companyId: body.companyId,
      productId: body.productId,
      type: body.type,
      quantity: body.quantity,
      reason: body.reason,
      noteId: body.noteId,
      createdBy: body.createdBy,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
