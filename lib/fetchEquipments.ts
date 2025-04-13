import { z } from "zod";

export const equipmentSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  value: z.number().nullable().optional(),
  stock: z.number(),
  is_available: z.boolean(),
  created_at: z.string(),
});

export type Equipment = z.infer<typeof equipmentSchema>;

export async function fetchEquipments(companyId: string): Promise<Equipment[]> {
  const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs");
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from("equipments")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar equipamentos:", error.message);
    return [];
  }

  const result = z.array(equipmentSchema).safeParse(data);

  if (!result.success) {
    console.error("Erro ao validar schema de equipamentos:", result.error);
    return [];
  }

  return result.data;
}