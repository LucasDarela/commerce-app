import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type EquipmentItem = {
  equipment_id: string;
  name: string;
  quantity: number;
};

type OrderItemRow = {
  product_id: number;
  quantity: number;
};

type LinkedEquipmentRow = {
  product_id: number;
  equipment_id: string;
  quantity: number;
  equipment: { name: string } | { name: string }[] | null;
};

export async function fetchEquipmentsForOrder(
  orderId: string,
  companyId: string,
): Promise<EquipmentItem[]> {
  const supabase = createBrowserSupabaseClient();

  if (!orderId || !companyId) return [];

  const { data: orderItemsRaw, error: orderItemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (orderItemsError || !orderItemsRaw) {
    console.error("Erro ao buscar order_items:", orderItemsError);
    return [];
  }

  const orderItems = orderItemsRaw as OrderItemRow[];

  if (orderItems.length === 0) return [];

  const productIds = [...new Set(orderItems.map((item) => item.product_id))];

  const { data: linkedEquipmentsRaw, error: linkError } = await supabase
    .from("product_loans")
    .select("product_id, equipment_id, quantity, equipment:equipment_id(name)")
    .in("product_id", productIds)
    .eq("company_id", companyId);

  if (linkError || !linkedEquipmentsRaw) {
    console.error("Erro ao buscar equipamentos vinculados:", linkError);
    return [];
  }

  const linkedEquipments = (linkedEquipmentsRaw as LinkedEquipmentRow[]).map(
    (item) => {
      const equipment = Array.isArray(item.equipment)
        ? item.equipment[0] || null
        : item.equipment;

      return {
        product_id: item.product_id,
        equipment_id: item.equipment_id,
        quantity: item.quantity,
        equipment,
      };
    },
  );

  const resultMap = new Map<string, EquipmentItem>();

  for (const orderItem of orderItems) {
    const equipmentsForProduct = linkedEquipments.filter(
      (item) => item.product_id === orderItem.product_id,
    );

    for (const item of equipmentsForProduct) {
      const totalQuantity = Number(item.quantity ?? 1) * Number(orderItem.quantity ?? 1);
      const existing = resultMap.get(item.equipment_id);

      if (existing) {
        existing.quantity += totalQuantity;
      } else {
        resultMap.set(item.equipment_id, {
          equipment_id: item.equipment_id,
          name: item.equipment?.name || "Equipamento",
          quantity: totalQuantity,
        });
      }
    }
  }

  return Array.from(resultMap.values());
}