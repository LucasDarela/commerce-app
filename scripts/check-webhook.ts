import { createClient } from "@supabase/supabase-js";
import * as https from "https";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWebhook() {
  try {
    console.log("🔍 Buscando as credenciais do Banco Inter no seu banco de dados...");

    const { data: integ, error: integErr } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("provider", "banco_inter")
      .limit(1)
      .single();

    if (integErr || !integ) {
      throw new Error("Nenhuma integração do Banco Inter encontrada no banco de dados.");
    }

    const { inter_client_id, inter_client_secret, inter_cert, inter_key, inter_account, env } = integ;
    console.log("✅ Certificados e credenciais recuperadas com sucesso da memória!");

    // 1. Obter Token OAuth
    const authUrl = "https://cdpj.partners.bancointer.com.br/oauth/v2/token";
    const authBody = new URLSearchParams({
      client_id: inter_client_id,
      client_secret: inter_client_secret,
      scope: "boleto-cobranca.read",
      grant_type: "client_credentials",
    }).toString();

    console.log("🔐 Autenticando com mTLS...");
    const tokenResponse = await makeRequest(authUrl, "POST", inter_cert, inter_key, inter_account, authBody, {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    if (!tokenResponse.access_token) {
      throw new Error("Falha ao obter access_token: " + JSON.stringify(tokenResponse));
    }

    // 2. Consultar Webhook
    console.log("📡 Consultando o Webhook atual no Banco Inter...");
    const webhookUrl = "https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/webhook";
    
    const webhookResponse = await makeRequest(webhookUrl, "GET", inter_cert, inter_key, inter_account, undefined, {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenResponse.access_token}`,
    });

    console.log("\n==========================================");
    console.log("🎉 RESULTADO DO WEBHOOK NO BANCO INTER 🎉");
    console.log("==========================================");
    console.log(JSON.stringify(webhookResponse, null, 2));
    console.log("==========================================\n");

  } catch (error: any) {
    console.error("\n❌ Erro ao consultar webhook:", error?.message || error);
  }
}

function makeRequest(url: string, method: string, cert: string, key: string, account: string, body?: string, headers?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      cert,
      key,
      rejectUnauthorized: true,
      headers: {
        "x-conta-corrente": account,
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

checkWebhook();
