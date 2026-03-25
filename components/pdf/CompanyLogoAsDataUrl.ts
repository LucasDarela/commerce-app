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

export async function getCompanyLogoAsDataUrl(logoPath: string) {
  if (!logoPath) return null;

  const { data, error } = await supabase.storage
    .from("companylogos")
    .createSignedUrl(logoPath, 60);

  if (error || !data?.signedUrl) return null;

  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;

  const blob = await res.blob();
  return blobToDataURL(blob);
}