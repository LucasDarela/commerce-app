import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as https from "https";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCobranca() {
  try {
    const { data: integ } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("provider", "banco_inter")
      .limit(1)
      .single();

    const { inter_client_id, inter_client_secret, inter_cert, inter_key, inter_account, env } = integ;

    const authUrl = "https://cdpj.partners.bancointer.com.br/oauth/v2/token";
    const authBody = new URLSearchParams({
      client_id: inter_client_id,
      client_secret: inter_client_secret,
      scope: "boleto-cobranca.read",
      grant_type: "client_credentials",
    }).toString();

    const tokenResponse = await makeRequest(authUrl, "POST", inter_cert, inter_key, inter_account, authBody, {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);

    const inicioStr = inicio.toISOString();
    const fimStr = fim.toISOString();

    const url = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/webhook/callbacks?dataHoraInicio=${inicioStr}&dataHoraFim=${fimStr}`;
    
    console.log("Buscando callbacks do webhook...");
    const response = await makeRequest(url, "GET", inter_cert, inter_key, inter_account, undefined, {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenResponse.access_token}`,
    });

    console.log(JSON.stringify(response, null, 2));

  } catch (error: any) {
    console.error(error?.message || error);
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

checkCobranca();
