// old 

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type EquipmentItem = {
  equipment_id: string;
  name: string;
  quantity: number;
};

type ParsedProduct = {
  name: string;
  quantity: number;
};

type LinkedEquipmentRow = {
  product_id: number;
  equipment_id: string;
  quantity: number;
  equipment: { name: string } | { name: string }[] | null;
};

export async function fetchEquipmentsForOrderProducts(
  productsText: string,
  companyId: string,
): Promise<EquipmentItem[]> {
  const supabase = createBrowserSupabaseClient(); 
  if (!productsText || !companyId) return [];

  const parsed: ParsedProduct[] = productsText
    .split(",")
    .map((entry) => {
      const match = entry.trim().match(/^(.+?) \((\d+)x\)$/);
      if (!match) return null;

      const [, name, quantity] = match;
      return {
        name: name.trim(),
        quantity: Number(quantity),
      };
    })
    .filter(Boolean) as ParsedProduct[];

  if (parsed.length === 0) return [];

  const productNames = parsed.map((p) => p.name);

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, name")
    .in("name", productNames)
    .eq("company_id", companyId);

  if (productsError || !productsData) {
    console.error("Erro ao buscar produtos:", productsError);
    return [];
  }

  if (productsData.length === 0) return [];

  const productIds = productsData.map((p) => p.id);

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

  for (const parsedProduct of parsed) {
    const product = productsData.find((p) => p.name === parsedProduct.name);
    if (!product) continue;

    const equipmentsForProduct = linkedEquipments.filter(
      (item) => item.product_id === product.id,
    );

    for (const item of equipmentsForProduct) {
      const totalQuantity = item.quantity * parsedProduct.quantity;
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