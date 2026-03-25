import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function generateNextNoteNumber(companyId: string) {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("note_number")
    .eq("company_id", companyId)
    .eq("document_type", "internal")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const lastNumber = Number(data?.note_number ?? 0);

  if (!Number.isFinite(lastNumber) || lastNumber <= 0) {
    return "000001";
  }

  return String(lastNumber + 1).padStart(6, "0");
}