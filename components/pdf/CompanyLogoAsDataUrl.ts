import { supabase } from "@/lib/supabase";

export async function getCompanyLogoAsDataUrl(companyId: string) {
  const { data: files, error: listError } = await supabase.storage
    .from("companylogos")
    .list(companyId, { limit: 1 });

  if (listError || !files || files.length === 0) {
    console.error("Nenhuma logo encontrada:", listError);
    return null;
  }

  const logoFileName = files[0].name;
  const path = `${companyId}/${logoFileName}`;

  const { data: file, error: downloadError } = await supabase.storage
    .from("companylogos")
    .download(path);

  if (downloadError || !file) {
    console.error("Erro ao baixar a logo:", downloadError);
    return null;
  }

  const blob = file;
  return await blobToDataURL(blob);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
