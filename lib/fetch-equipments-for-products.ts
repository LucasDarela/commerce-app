import { supabase } from "@/lib/supabase"

type EquipmentItem = {
  equipment_id: string
  name: string
  quantity: number
}

type LinkedEquipment = {
  equipment_id: string
  quantity: number
  equipment: { name: string } | null
}

export async function fetchEquipmentsForOrderProducts(productsText: string): Promise<EquipmentItem[]> {
  if (!productsText) return []

  const parsed = productsText
    .split(",")
    .map((entry) => {
      const match = entry.trim().match(/^(.+?) \((\d+)x\)$/)
      if (!match) return null
      const [, name, quantity] = match
      return { name: name.trim(), quantity: Number(quantity) }
    })
    .filter(Boolean) as { name: string; quantity: number }[]

  const productNames = parsed.map((p) => p.name)

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, name")
    .in("name", productNames)

  if (productsError || !productsData) {
    console.error("Erro ao buscar produtos:", productsError)
    return []
  }

  const equipments: EquipmentItem[] = []

  for (const parsedProduct of parsed) {
    const product = productsData.find((p) => p.name === parsedProduct.name)
    if (!product) continue

const { data: linkedEquipmentsRaw, error: linkError } = await supabase
  .from("product_loans")
  .select("equipment_id, quantity, equipment:equipment_id(name)")
  .eq("product_id", product.id)

const linkedEquipments = linkedEquipmentsRaw as LinkedEquipment[]

if (linkError) {
  console.error("Erro ao buscar equipamentos vinculados:", linkError)
  continue
}

linkedEquipments.forEach((item) => {
  equipments.push({
    equipment_id: item.equipment_id,
    name: item.equipment?.name || "Equipamento",
    quantity: item.quantity * parsedProduct.quantity,
  })
})
  }

  return equipments
}