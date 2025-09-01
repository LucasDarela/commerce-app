// lib/focus-nfe/client.ts
export type FocusEnv = "homologacao" | "producao";

export function getFocusBaseUrl(env: FocusEnv) {
  return env === "homologacao"
    ? "https://homologacao.focusnfe.com.br/v2"
    : "https://api.focusnfe.com.br/v2";
}

// lib/focus-nfe/client.ts
export function focusAuthHeader(rawToken: string) {
  // remove espaços e quebras que às vezes vêm do DB/clipboard
  const token = String(rawToken)
    .trim()
    .replace(/\r?\n|\r/g, "");
  // opcional: logue prefixo para conferir se está lendo do DB certo
  console.log("[Focus] token prefix:", token.slice(0, 6));
  const basic = Buffer.from(`${token}:`).toString("base64");
  console.log("[Focus] basic prefix:", basic.slice(0, 8)); // só pra debug
  return `Basic ${basic}`;
}
