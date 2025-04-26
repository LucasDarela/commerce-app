// app/api/integrations/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/components/types/supabase"

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookies(), 
  });

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const { provider, access_token } = body

  if (!provider || !access_token) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!companyUser) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  // Remove integração anterior, se houver
  await supabase
    .from("company_integrations")
    .delete()
    .eq("company_id", companyUser.company_id)
    .eq("provider", provider)

  // Insere nova integração
  const { error } = await supabase
    .from("company_integrations")
    .insert({
      company_id: companyUser.company_id,
      provider,
      access_token,
    })

  if (error) {
    console.error("Erro ao salvar integração:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const provider = req.nextUrl.searchParams.get("provider")
  if (!provider) {
    return NextResponse.json({ error: "Provider não informado" }, { status: 400 })
  }

  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!companyUser) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  const { error } = await supabase
    .from("company_integrations")
    .delete()
    .eq("company_id", companyUser.company_id)
    .eq("provider", provider)

  if (error) {
    console.error("Erro ao deletar integração:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
