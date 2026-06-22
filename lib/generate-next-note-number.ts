import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function generateNextNoteNumber(companyId: string) {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("note_number")
    .eq("company_id", companyId)
    .eq("document_type", "internal")
    .not("note_number", "is", null)
    .neq("note_number", "");

  if (error) {
    console.error("Erro ao gerar próximo número de nota:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      companyId,
    });
    return "000001";
  }

  if (!data || data.length === 0) {
    return "000001";
  }

  const lastNumber = data.reduce((max, record) => {
    const num = Number(record.note_number);
    if (Number.isFinite(num) && num > max) {
      return num;
    }
    return max;
  }, 0);

  return String(lastNumber + 1).padStart(6, "0");
}