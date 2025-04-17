import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/components/types/supabase";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
  const cookieStore = await cookies() as ReadonlyRequestCookies;

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {
          },
          remove() {
          },
        },
      }
    );

    // 🔍 Validação de campos obrigatórios
    if (!body.nome || !body.document || !body.total || !body.days_ticket || !body.order_id) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const cleanDoc = body.document.replace(/\D/g, "");
    const docType = cleanDoc.length === 11 ? "CPF" : "CNPJ";
    const [first_name, ...rest] = (body.nome || "Cliente").split(" ");
    const last_name = rest.join(" ") || "Sobrenome";

    const daysToExpire = parseInt(body.days_ticket) || 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToExpire);
    const formattedDueDate = dueDate.toISOString();

    const idempotencyKey = `${cleanDoc}-${Date.now()}`;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: Number(body.total),
        payment_method_id: "bolbradesco",
        description: "Pedido no Chopp Hub",
        statement_descriptor: "CHOPPHUB",
        date_of_expiration: formattedDueDate,
        payer: {
          email: body.email,
          first_name,
          last_name,
          identification: {
            type: docType,
            number: cleanDoc,
          },
          address: {
            zip_code: body.zip_code ?? "",
            street_name: body.address ?? "",
            street_number: body.number ?? "",
            neighborhood: body.neighborhood ?? "",
            city: body.city ?? "",
            federal_unit: body.state ?? "",
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro na API do Mercado Pago:", data);
      return NextResponse.json(
        { error: "Erro ao gerar pagamento", details: data },
        { status: 500 }
      );
    }

    // ✅ Salva os dados do boleto no pedido correspondente
    await supabase
      .from("orders")
      .update({
        boleto_url: data.transaction_details?.external_resource_url,
        boleto_digitable_line: data.transaction_details?.barcode?.digitable_line,
        boleto_barcode_number: data.transaction_details?.barcode?.content,
        boleto_id: data.id,
        boleto_expiration_date: data.date_of_expiration,
      })
      .eq("id", body.order_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Erro interno no create-payment:", error);
    return NextResponse.json({ error: "Erro interno ao gerar boleto" }, { status: 500 });
  }
}