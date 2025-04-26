"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo: { width: 100, height: 40 },
  title: { fontSize: 14, textAlign: "center", marginBottom: 12, fontWeight: "bold" },
  box: { border: "1pt solid #000", padding: 10, borderRadius: 4, marginBottom: 10 },
  label: { fontWeight: "bold", fontSize: 10, marginBottom: 2 },
  value: { fontSize: 10, marginBottom: 6 },
  barcodeBox: {
    marginTop: 12,
    padding: 8,
    border: "1pt solid #000",
    borderRadius: 6,
    textAlign: "center",
    alignItems: "center"
  },
  barcodeImage: {
    width: 260,
    height: 60,
    objectFit: "contain",
    marginVertical: 8,
  },
  signatureBox: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1pt solid #000",
    alignItems: "center",
  },
  signature: {
    width: 160,
    height: 80,
    marginTop: 6,
  },
  section: {
    marginBottom: 10,
  },
})

interface BoletoPDFProps {
  order: any;
  signatureData: string;
  vencimentoStr: string;
}

export function BoletoPDF({ order, signatureData, vencimentoStr }: BoletoPDFProps) {
  const companyName = order.company?.name || "Nome da Empresa"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {order.company_logo ? (
            <Image src={order.company_logo} style={styles.logo} />
          ) : (
            <Text style={styles.label}>{companyName}</Text>
          )}
          <View>
            <Text style={styles.label}>Vencimento:</Text>
            <Text style={styles.value}>{vencimentoStr}</Text>
            <Text style={styles.label}>Valor:</Text>
            <Text style={styles.value}>R$ {order.total?.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Boleto Bancário - Pedido Nº {order.note_number}</Text>

        {/* Dados do cliente e pagamento */}
        <View style={styles.section}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>{order.customer}</Text>

          <Text style={styles.label}>Valor total:</Text>
          <Text style={styles.value}>R$ {order.total?.toFixed(2)}</Text>

          <Text style={styles.label}>Vencimento:</Text>
          <Text style={styles.value}>{vencimentoStr}</Text>
        </View>

        {/* Linha digitável */}
        {order.boleto_digitable_line && (
          <View style={styles.section}>
            <Text style={styles.label}>Linha Digitável:</Text>
            <Text style={styles.value}>{order.boleto_digitable_line}</Text>
          </View>
        )}

        {/* Código de barras */}
        {order.boleto_barcode_number && (
          <View style={styles.barcodeBox}>
            <Text style={styles.label}>Código de Barras:</Text>
            <Text>{order.boleto_barcode_number}</Text>
          </View>
        )}

                {/* Código de barras (imagem) */}
                {order.boleto_barcode_image && (
          <View style={styles.barcodeBox}>
            <Text style={styles.label}>Código de Barras:</Text>
            <Image src={order.boleto_barcode_image} style={styles.barcodeImage} />
          </View>
        )}

        {/* Assinatura */}
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Assinatura do Cliente</Text>
          {signatureData && <Image src={signatureData} style={styles.signature} />}
        </View>
      </Page>
    </Document>
  );
}