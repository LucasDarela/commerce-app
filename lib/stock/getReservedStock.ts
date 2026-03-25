import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function getReservedStock(
  productId: number,
  companyId: string,
): Promise<number> {
  const supabase = createBrowserSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      quantity,
      orders!inner (
        appointment_date,
        company_id
      )
    `)
    .eq("product_id", productId)
    .eq("orders.company_id", companyId)
    .gt("orders.appointment_date", today);

  if (error) {
    console.error("Erro ao buscar estoque reservado:", error);
    return 0;
  }

  return (data ?? []).reduce((sum, item: any) => {
    return sum + (Number(item.quantity) || 0);
  }, 0);
}