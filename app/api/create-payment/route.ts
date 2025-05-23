import { cookies as nextCookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { Database } from "@/components/types/supabase"; 

export async function POST(req: Request) {
  try {
    const cookieStore = await nextCookies(); 
    const supabase = createServerComponentClient<Database>({
      cookies: () => cookieStore,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("👤 User:", user);

    const body = await req.json();

    console.log("🧪 USER LOGADO:", user)
    const { data: companyUser, error: companyError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user?.id)
      .single()

    if (!companyUser || companyError) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 400 })
    }

    const { data: company, error: companyFetchError } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyUser.company_id)
    .single()

    if (!company || companyFetchError) {
      return NextResponse.json({ error: "Nome da empresa não encontrado" }, { status: 400 })
    }

    // Valida campos obrigatórios
    const requiredFields = [
      "nome", "document", "email", "total", "days_ticket", "order_id",
      "zip_code", "address", "number", "neighborhood", "city", "state"
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Campo obrigatório ausente: ${field}` }, { status: 400 })
      }
    }

    const { data: integration } = await supabase
      .from("company_integrations")
      .select("access_token")
      .eq("company_id", companyUser.company_id)
      .eq("provider", "mercado_pago")
      .single()

    if (!integration || !integration.access_token) {
      return NextResponse.json({ error: "Access Token não configurado" }, { status: 400 })
    }

    const accessToken = integration.access_token

    // Dados para API Mercado Pago
    const cleanDoc = body.document.replace(/\D/g, "")
    const docType = cleanDoc.length === 11 ? "CPF" : "CNPJ"
    const [first_name, ...rest] = body.nome.split(" ")
    const last_name = rest.join(" ") || "Sobrenome"

    const daysToExpire = parseInt(body.days_ticket) || 1
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + daysToExpire)
    const formattedDueDate = dueDate.toISOString()

    const idempotencyKey = `${cleanDoc}-${body.order_id}`

    const paymentData = {
      transaction_amount: Number(body.total),
      payment_method_id: "bolbradesco", 
      description: company.name,
      date_of_expiration: formattedDueDate,
      external_reference: body.order_id,
      notification_url: body.notification_url || "https://seusite.com/api/mp-notify",
      payer: {
        email: body.email,
        first_name,
        last_name,
        identification: {
          type: docType,
          number: cleanDoc,
        },
        address: {
          zip_code: body.zip_code.replace(/\D/g, ""),
          street_name: body.address,
          street_number: String(body.number || "0"),
          neighborhood: body.neighborhood,
          city: body.city,
          federal_unit: body.state,
        },
      },
    }

    // 🔥 Enviar para o Mercado Pago
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    })

    const data = await response.json()

    if (!response.ok || !data.transaction_details?.barcode?.content) {
      console.error("❌ Erro ao gerar boleto:", {
        status: response.status,
        message: data.message,
        cause: data.cause,
        full: data,
      });
    
      return NextResponse.json({
        error: "Erro ao gerar boleto",
        details: {
          status: response.status,
          message: data.message,
          cause: data.cause,
        }
      }, { status: 500 });
    }

    // Atualizar pedido no Supabase
    await supabase
    .from("orders")
    .update({
      boleto_url: data.transaction_details.external_resource_url,
      boleto_barcode_number: data.transaction_details.barcode.content,
      boleto_digitable_line: data.transaction_details.payment_method_reference_id,
      boleto_id: data.id,
      boleto_expiration_date: data.date_of_expiration,
    })
    .eq("id", body.order_id)


      return NextResponse.json({ success: true });

    } catch (error) {
      console.error("❌ Erro interno:", error);
      return NextResponse.json({ error: "Erro interno ao gerar boleto" }, { status: 500 });
    }
  }