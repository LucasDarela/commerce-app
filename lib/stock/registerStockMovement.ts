import { createRouteSupabaseClient } from "@/lib/supabase/server";

type RegisterStockMovementInput = {
  companyId: string;
  productId: string;
  type: "entry" | "exit" | "return";
  quantity: number;
  reason?: string;
  noteId?: string;
  createdBy: string;
};

export async function registerStockMovement({
  companyId,
  productId,
  type,
  quantity,
  reason,
  noteId,
  createdBy,
}: RegisterStockMovementInput) {
  const supabase = await createRouteSupabaseClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, stock, company_id")
    .eq("id", productId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (productError || !product) {
    throw new Error("Produto não encontrado.");
  }

  const currentStock = Number(product.stock ?? 0);

  let newStock = currentStock;

  if (type === "entry" || type === "return") {
    newStock = currentStock + quantity;
  } else if (type === "exit") {
    newStock = currentStock - quantity;
  } else {
    throw new Error("Tipo de movimentação inválido.");
  }

  if (type === "exit" && newStock < 0) {
    throw new Error("Estoque não pode ficar negativo.");
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", productId)
    .eq("company_id", companyId);

  if (updateError) {
    throw new Error("Erro ao atualizar estoque do produto.");
  }

  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      company_id: companyId,
      product_id: productId,
      type,
      quantity,
      reason,
      note_id: noteId,
      created_by: createdBy,
    });

  if (movementError) {
    throw new Error("Erro ao registrar movimentação de estoque.");
  }

  return { success: true };
}