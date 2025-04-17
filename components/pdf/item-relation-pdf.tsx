import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import dayjs from "dayjs"
import logo from "@/app/assets/logo-bk.png"

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    padding: 40,
    color: "#000",
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 100,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  section: {
    border: "1pt solid #000",
    padding: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bold: {
    fontWeight: "bold",
  },
  table: {
    marginTop: 10,
    border: "1pt solid #ccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #ccc",
    alignItems: "center",
  },
  cell: {
    padding: 4,
    flexGrow: 1,
    fontSize: 9,
  },
  cellRight: {
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    fontSize: 9,
  },
  separator: {
    marginVertical: 20,
    borderTop: "1pt dashed #999",
  },
})

const RelationSection = ({ company, customer, items, note }: any) => {
  const total = items.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0
  )

  return (
    <View>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Image src={logo.src} style={styles.logo} />
        <View>
          <Text>Nota: <Text style={styles.bold}>{note?.number ?? "000000"}</Text></Text>
          <Text>Data: {dayjs().format("DD/MM/YYYY HH:mm")}</Text>
        </View>
      </View>

      <Text style={styles.title}>RELAÇÃO DE ITENS</Text>

      {/* Empresa e Cliente */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 4 }]}>
          <Text style={styles.bold}>{company.name}</Text>
          <Text>{company.document}</Text>
          <Text>{company.address}, {company.number}</Text>
          <Text>{company.city} - {company.state}, {company.zip_code}</Text>
          <Text>{company.phone}</Text>
        </View>
        <View style={[styles.section, { flex: 1, marginLeft: 4 }]}>
          <Text style={styles.bold}>{customer.name}</Text>
          <Text>{customer.document}</Text>
          <Text>{customer.address}, {customer.number}</Text>
          <Text>{customer.city} - {customer.state}, {customer.zip_code}</Text>
          <Text>{customer.phone}</Text>
        </View>
      </View>

      {/* Tabela de Itens */}
      <View style={styles.table}>
        <View style={[styles.tableRow, { backgroundColor: "#eee" }]}>
          <Text style={[styles.cell, { flex: 0.5 }]}>Código</Text>
          <Text style={[styles.cell, { flex: 2 }]}>Descrição</Text>
          <Text style={[styles.cell, styles.cellRight]}>Qtd</Text>
          <Text style={[styles.cell, styles.cellRight]}>V. Unitário</Text>
          <Text style={[styles.cell, styles.cellRight]}>V. Total</Text>
        </View>
        {items.map((item: any, index: number) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.cell, { flex: 0.5 }]}>{item.code ?? "000"}</Text>
            <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
            <Text style={[styles.cell, styles.cellRight]}>{item.quantity}</Text>
            <Text style={[styles.cell, styles.cellRight]}>
              R$ {item.unit_price.toFixed(2)}
            </Text>
            <Text style={[styles.cell, styles.cellRight]}>
              R$ {(item.quantity * item.unit_price).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.bold}>Total: R$ {total.toFixed(2)}</Text>
      </View>

      {/* Rodapé */}
      <Text style={styles.footer}>
        ASS:______________________________________________
      </Text>
    </View>
  )
}

export function ItemRelationPDF({ company, customer, items, note }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Parte de cima */}
        <RelationSection company={company} customer={customer} items={items} note={note} />

        {/* Separador */}
        <View style={styles.separator} />

        {/* Parte de baixo (duplicada) */}
        <RelationSection company={company} customer={customer} items={items} note={note} />
      </Page>
    </Document>
  )
}