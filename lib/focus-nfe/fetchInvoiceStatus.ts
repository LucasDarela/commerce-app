import axios from "axios";

export async function fetchInvoiceStatus(ref: string) {
  try {
    const { data } = await axios.get(
      `https://api.focusnfe.com.br/v2/nfe/${ref}`,
      {
        headers: {
          Authorization: `Token token=${process.env.FOCUS_NFE_API_KEY}`,
        },
      },
    );

    return { data };
  } catch (error: any) {
    console.error(
      "Erro ao buscar status da NF-e:",
      error.response?.data || error.message,
    );
    return { error: error.response?.data || error.message };
  }
}
