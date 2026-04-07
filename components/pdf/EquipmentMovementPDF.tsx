"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type EquipmentMovementRow = {
  kind: "loan" | "return";
  dateISO: string;
  dateLabel: string;
  customerName: string;
  equipmentName: string;
  quantity: number;
  remainingAfter?: number | null;
  noteNumber?: string | null;
};

type Props = {
  rows: EquipmentMovementRow[];
  startDate: string;
  endDate?: string;
  summary: {
    totalLoans: number;
    totalReturns: number;
    totalLoaned: number;
    totalReturned: number;
  };
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  title: { fontSize: 16, marginBottom: 6, fontWeight: "bold" },
  subtitle: { marginBottom: 14, color: "#555" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryBox: { flex: 1, border: "1 solid #ddd", padding: 8 },
  summaryLabel: { fontSize: 9, color: "#666", marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: "bold" },
  table: { width: "100%", border: "1 solid #ddd" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderBottom: "1 solid #ddd",
  },
  row: { flexDirection: "row", borderBottom: "1 solid #eee" },
  rowAlt: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
    backgroundColor: "#fafafa",
  },
  cell: { padding: 6, fontSize: 9 },
  colDate: { width: "12%" },
  colType: { width: "12%" },
  colCustomer: { width: "24%" },
  colEquipment: { width: "22%" },
  colQty: { width: "10%", textAlign: "center" },
  colRemaining: { width: "10%", textAlign: "center" },
  colNote: { width: "10%" },
  loanText: { color: "#0055cc" },
  returnText: { color: "#15803d" },
});

export function EquipmentMovementPDF({ rows, startDate, endDate, summary }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.title}>Relatório de Movimentações de Equipamentos</Text>
        <Text style={styles.subtitle}>
          Período: {startDate}{endDate ? ` até ${endDate}` : ""}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total de Entregas</Text>
            <Text style={styles.summaryValue}>{summary.totalLoans} movimentação(ões)</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Qtd. Total Entregue</Text>
            <Text style={styles.summaryValue}>{summary.totalLoaned} un.</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total de Recolhas</Text>
            <Text style={styles.summaryValue}>{summary.totalReturns} movimentação(ões)</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Qtd. Total Recolhida</Text>
            <Text style={styles.summaryValue}>{summary.totalReturned} un.</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.colDate]}>Data</Text>
            <Text style={[styles.cell, styles.colType]}>Tipo</Text>
            <Text style={[styles.cell, styles.colCustomer]}>Cliente</Text>
            <Text style={[styles.cell, styles.colEquipment]}>Equipamento</Text>
            <Text style={[styles.cell, styles.colQty]}>Qtd.</Text>
            <Text style={[styles.cell, styles.colRemaining]}>Restante</Text>
            <Text style={[styles.cell, styles.colNote]}>Nota</Text>
          </View>

          {rows.map((row, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.row : styles.rowAlt}>
              <Text style={[styles.cell, styles.colDate]}>{row.dateLabel}</Text>
              <Text
                style={[
                  styles.cell,
                  styles.colType,
                  row.kind === "loan" ? styles.loanText : styles.returnText,
                ]}
              >
                {row.kind === "loan" ? "Entrega" : "Recolha"}
              </Text>
              <Text style={[styles.cell, styles.colCustomer]}>{row.customerName}</Text>
              <Text style={[styles.cell, styles.colEquipment]}>{row.equipmentName}</Text>
              <Text style={[styles.cell, styles.colQty]}>{row.quantity}</Text>
              <Text style={[styles.cell, styles.colRemaining]}>
                {row.kind === "return" && row.remainingAfter != null
                  ? String(row.remainingAfter)
                  : "—"}
              </Text>
              <Text style={[styles.cell, styles.colNote]}>{row.noteNumber ?? "—"}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
