import { supabase } from "@/lib/supabase"

export async function getReservedStock(productId: number): Promise<number> {
  const today = new Date().toISOString().split("T")[0] // Formato YYYY-MM-DD

  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, orders(appointment_date)")
    .eq("product_id", productId)

  if (error || !data) {
    console.error("Erro ao buscar estoque reservado:", error)
    return 0
  }

  const futureQuantities = data
    .filter((item: any) => {
      const appointmentDate = item.orders?.appointment_date
      return appointmentDate && appointmentDate > today
    })
    .reduce((sum, item) => sum + item.quantity, 0)

  return futureQuantities
}