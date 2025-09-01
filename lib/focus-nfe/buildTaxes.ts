// lib/focus-nfe/buildTaxes.ts
const pad2 = (v: any) => String(v ?? "").padStart(2, "0");
const round = (v: number) => Number((v ?? 0).toFixed(2));

export function buildPisFields(item: any) {
  const cst = pad2(item.pis_situacao_tributaria);
  // Não tributado / alíquota zero: só manda o CST
  if (["04", "06", "07", "08"].includes(cst)) {
    return { pis_situacao_tributaria: cst };
  }
  // Tributado por alíquota ad valorem (01) ou “Outras” (99)
  if (["01", "99"].includes(cst)) {
    return {
      pis_situacao_tributaria: cst,
      valor_base_calculo_pis: round(
        item.valor_base_calculo_pis ?? item.valor_bruto ?? 0,
      ),
      aliquota_pis: round(item.aliquota_pis ?? 0),
      valor_pis: round(item.valor_pis ?? 0),
    };
  }
  // fallback seguro
  return { pis_situacao_tributaria: "06" };
}

export function buildCofinsFields(item: any) {
  const cst = pad2(item.cofins_situacao_tributaria);
  if (["04", "06", "07", "08"].includes(cst)) {
    return { cofins_situacao_tributaria: cst };
  }
  if (["01", "99"].includes(cst)) {
    return {
      cofins_situacao_tributaria: cst,
      valor_base_calculo_cofins: round(
        item.valor_base_calculo_cofins ?? item.valor_bruto ?? 0,
      ),
      aliquota_cofins: round(item.aliquota_cofins ?? 0),
      valor_cofins: round(item.valor_cofins ?? 0),
    };
  }
  return { cofins_situacao_tributaria: "06" };
}
