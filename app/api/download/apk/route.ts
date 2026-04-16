import { createRouteSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const supabase = await createRouteSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    // Verifica permissão da empresa vinculada ao usuário
    const { data: companyUser, error } = await supabase
      .from("company_users")
      .select("companies(mobile_offline_enabled)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !companyUser) {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const isEnabled = (companyUser.companies as any)?.mobile_offline_enabled;

    if (!isEnabled) {
      return new NextResponse("Recurso não disponível para sua empresa", {
        status: 403,
      });
    }

    const filePath = path.join(
      process.cwd(),
      "private-assets",
      "ChoppHubDriver.apk",
    );

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    // Lê o arquivo e retorna como stream para eficiência
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="ChoppHubDriver.apk"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[DOWNLOAD_APK_ERROR]", error);
    return new NextResponse("Erro interno no servidor", { status: 500 });
  }
}
