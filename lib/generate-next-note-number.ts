// lib/generate-next-note-number.ts
import { supabase } from "@/lib/supabase";

export async function generateNextNoteNumber(
  companyId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("orders")
    .select("note_number")
    .eq("company_id", companyId)
    .eq("document_type", "internal")
    .order("note_number", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Erro ao buscar último número de nota:", error);
    return "000001";
  }

  const last = data?.[0]?.note_number;
  const lastNumber = Number(last) || 0;
  const nextNumber = lastNumber + 1;

  return nextNumber.toString().padStart(6, "0");
}
