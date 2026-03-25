import { z } from "zod";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export const equipmentSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  code: z.union([z.string(), z.number()]).nullable().optional(),
  description: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  value: z.number().nullable().optional(),
  stock: z.number(),
  is_available: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export type Equipment = z.infer<typeof equipmentSchema>;

export async function fetchEquipments(companyId: string): Promise<Equipment[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("equipments")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar equipamentos:", error);
    return [];
  }

  const normalizedData = (data ?? []).map((item) => ({
    ...item,
    code: item.code ?? null,
    category: item.category ?? null,
    type: item.type ?? null,
    brand: item.brand ?? null,
    model: item.model ?? null,
    serial_number: item.serial_number ?? null,
    description: item.description ?? null,
    unit_price:
      item.unit_price === null || item.unit_price === undefined
        ? null
        : Number(item.unit_price),
    value:
      item.value === null || item.value === undefined
        ? null
        : Number(item.value),
    stock: Number(item.stock ?? 0),
    is_available:
      item.is_available === null || item.is_available === undefined
        ? true
        : Boolean(item.is_available),
    created_at: item.created_at ?? null,
  }));

  const result = z.array(equipmentSchema).safeParse(normalizedData);

  if (!result.success) {
    console.error("Erro ao validar schema de equipamentos:", result.error);
    console.log("normalizedData com erro:", normalizedData);
    return [];
  }

  return result.data.map((item) => ({
    ...item,
    code:
      item.code === null || item.code === undefined
        ? null
        : String(item.code),
  }));
}