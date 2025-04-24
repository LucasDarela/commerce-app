import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/components/types/supabase"
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { mercadopago } from '@/lib/mercadoPago'

type PaymentRequest = {
  nome: string
  document: string
  email: string
  total: number
  days_ticket: string
  order_id: string
  zip_code: string
  address: string
  number: string | number
  neighborhood: string
  city: string
  state: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, any>
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {}
        }
      }
    )

    // 🔍 Validação dos campos obrigatórios
    const requiredFields = [
      "nome", "document", "email", "total", "days_ticket", "order_id",
      "zip_code", "address", "number", "neighborhood", "city", "state"
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Campo obrigatório ausente: ${field}` },
          { status: 400 }
        )
      }
    }

    const cleanDoc = body.document.replace(/\D/g, "")
    const docType = cleanDoc.length === 11 ? "CPF" : "CNPJ"
    const [first_name, ...rest] = (body.nome || "Cliente").split(" ")
    const last_name = rest.join(" ") || "Sobrenome"

    const daysToExpire = parseInt(body.days_ticket) || 1
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + daysToExpire)
    const formattedDueDate = dueDate.toISOString()

    const idempotencyKey = `${cleanDoc}-${Date.now()}`

    // const response = await fetch("https://api.mercadopago.com/v1/payments", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    //     "Content-Type": "application/json",
    //     "X-Idempotency-Key": idempotencyKey,
    //   },
    //   body: JSON.stringify({
    //     transaction_amount: Number(body.total),
    //     payment_method_id: "bolbradesco"
    //     payment_type_id: "ticket"
    //     description: "Pedido no Chopp Hub",
    //     statement_descriptor: "CHOPPHUB",
    //     date_of_expiration: formattedDueDate,
    //     external_reference: body.order_id,
    //     payer: {
    //       email: body.email,
    //       first_name,
    //       last_name,
    //       identification: {
    //         type: docType,
    //         number: cleanDoc,
    //       },
    //       address: {
    //         zip_code: body.zip_code,
    //         street_name: body.address,
    //         street_number: body.number,
    //         neighborhood: body.neighborhood,
    //         city: body.city,
    //         federal_unit: body.state,
    //       },
    //     },
    //   }),
    // })

    const paymentData = {
      transaction_amount: Number(body.total),
      payment_method_id: "bolbradesco",
      payment_type_id: "ticket",
      description: "Pedido no Chopp Hub",
      date_of_expiration: formattedDueDate,
      external_reference: body.order_id,
      payer: {
        email: body.email,
        first_name: first_name,
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
      items: [
        {
          title: "Pedido no Chopp Hub",
          quantity: 1,
          unit_price: Number(body.total),
        },
      ],
    };
    
    const payments = new Payment(mercadopago)
    const payment = await payments.create({ body: paymentData })
    const data = payment;
    
    console.log("🧾 Dados do boleto:", JSON.stringify(data.transaction_details, null, 2));
    
    if (!data.transaction_details?.barcode?.content) {
      console.error("❌ Erro ao gerar boleto: resposta inválida", data);
      return NextResponse.json({ error: "Erro ao gerar boleto", details: data }, { status: 500 });
    }

    await supabase
    .from("orders")
    .update({
      boleto_url: data.transaction_details?.external_resource_url,
      boleto_barcode_number: data.transaction_details?.barcode?.content,
      boleto_id: data.id,
      boleto_expiration_date: data.date_of_expiration,
    })
    .eq("id", body.order_id)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro interno:", error)
    return NextResponse.json({ error: "Erro interno ao gerar boleto" }, { status: 500 })
  }
}