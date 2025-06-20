import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface StockMovementParams {
  companyId: string;
  productId: number;
  type: "input" | "output" | "return" | "adjustment";
  quantity: number;
  reason?: string;
  noteId?: string;
  createdBy: string;
}

export async function registerStockMovement(params: StockMovementParams) {
  const { companyId, productId, type, quantity, reason, noteId, createdBy } =
    params;

  const { error } = await supabase.from("stock_movements").insert([
    {
      company_id: companyId,
      product_id: productId,
      type,
      quantity,
      reason,
      note_id: noteId,
      created_by: createdBy,
    },
  ]);

  if (error) {
    console.error("Error registering stock movement:", error);
    throw error;
  }
}
