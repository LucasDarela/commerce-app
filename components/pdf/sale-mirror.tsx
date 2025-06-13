// components/pdf/SaleMirror.tsx
"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11 },
  section: { marginBottom: 12 },
  title: { fontSize: 14, marginBottom: 8, fontWeight: 700 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  bold: { fontWeight: 700 },
});

export function SaleMirrorPDF({ company, customer, items }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Espelho da Venda</Text>

        <View style={styles.section}>
          <Text style={styles.bold}>Fornecedor:</Text>
          <Text>{company.name}</Text>
          <Text>
            {company.document} • {company.email}
          </Text>
          <Text>
            {company.address}, {company.number} - {company.neighborhood}
          </Text>
          <Text>
            {company.city} - {company.state} | CEP: {company.zip_code}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bold}>Cliente:</Text>
          <Text>{customer.name}</Text>
          <Text>
            {customer.document} • {customer.email}
          </Text>
          <Text>
            {customer.address}, {customer.number} - {customer.neighborhood}
          </Text>
          <Text>
            {customer.city} - {customer.state} | CEP: {customer.zip_code}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bold}>Itens Vendidos:</Text>
          {items.map((item: any, index: number) => (
            <View style={styles.row} key={index}>
              <Text>{item.name}</Text>
              <Text>
                {item.quantity} x R$ {item.unit_price.toFixed(2)} = R$
                {(item.quantity * item.unit_price).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <Text style={styles.bold}>Total:</Text>
          <Text style={styles.bold}>
            R${" "}
            {items
              .reduce(
                (acc: number, item: any) =>
                  acc + item.quantity * item.unit_price,
                0,
              )
              .toFixed(2)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
