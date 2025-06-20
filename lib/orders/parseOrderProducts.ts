import { supabase } from "@/lib/supabase";

interface ParsedProduct {
  id: number;
  name: string;
  quantity: number;
}

export async function parseOrderProducts(
  orderProductsText: string,
): Promise<ParsedProduct[]> {
  if (!orderProductsText) return [];

  const parsed = orderProductsText
    .split(",")
    .map((entry) => {
      const match = entry.trim().match(/^(.+?) \((\d+)x\)$/);
      if (!match) return null;

      const [_, name, quantity] = match;
      return {
        name: name.trim(),
        quantity: Number(quantity),
      };
    })
    .filter(Boolean) as { name: string; quantity: number }[];

  if (parsed.length === 0) return [];

  const names = parsed.map((p) => p.name);

  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .in("name", names);

  if (error) {
    console.error("❌ Erro ao buscar IDs dos produtos:", error);
    return [];
  }

  return parsed
    .map((p) => {
      const product = data.find((d) => d.name === p.name);
      if (!product) return null;
      return {
        id: product.id,
        name: p.name,
        quantity: p.quantity,
      };
    })
    .filter(Boolean) as ParsedProduct[];
}
