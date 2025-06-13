import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { EquipmentLoan } from "@/components/types/equipments";
import { z } from "zod";

export const equipmentLoanSchema = z.object({
  id: z.string(),
  equipment_id: z.string(),
  customer_id: z.string(),
  company_id: z.string(),
  quantity: z.number().default(1),
  start_date: z.string(),
  end_date: z.string().nullable(),
  status: z.enum(["Deposito", "Cliente"]),
  created_at: z.string(),
});

export async function fetchEquipmentLoans(
  companyId: string,
): Promise<EquipmentLoan[]> {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from("equipment_loans")
    .select("*")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Erro ao buscar empréstimos de equipamentos:", error.message);
    return [];
  }

  const result = z.array(equipmentLoanSchema).safeParse(data);

  if (!result.success) {
    console.error("Erro ao validar schema de equipment_loans:", result.error);
    return [];
  }

  return result.data;
}
