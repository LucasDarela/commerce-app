import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const supabase = createBrowserSupabaseClient();

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getCompanyLogoAsDataUrl(companyId: string) {
  try {
    if (!companyId) return null;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("logo_url")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("Erro ao buscar empresa:", companyError);
      return null;
    }

    const logoUrl = company?.logo_url;

    if (!logoUrl) return null;

    const res = await fetch(logoUrl);
    if (!res.ok) {
      console.error("Erro ao baixar logo:", res.status);
      return null;
    }

    const blob = await res.blob();
    return await blobToDataURL(blob);
  } catch (error) {
    console.error("Erro em getCompanyLogoAsDataUrl:", error);
    return null;
  }
}