
async function main() {
  const payload = [
    {
      "cobranca": {
        "codigoSolicitacao": "test-inter-id",
        "situacao": "RECEBIDO",
        "valorRecebido": 150.00,
        "dataHoraSituacao": "2023-11-21T10:00:00Z"
      }
    }
  ];

  const res = await fetch("http://localhost:3000/api/inter/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

main();
