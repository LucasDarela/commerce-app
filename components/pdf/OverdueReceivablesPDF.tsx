"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

type Row = {
  id: string;
  due_date: string | null;
  customer: string | null;
  note_number: string | number | null;
  total: number | null;
  total_payed: number | null;
};

type Props = {
  rows: Row[];
  startDate: string;
  endDate?: string;
  summary: {
    totalPending: number;
    count: number;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: "bold",
    color: "#b91c1c", // red-700
  },
  subtitle: {
    marginBottom: 14,
    color: "#555",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    border: "1 solid #ef4444", // red-500
    backgroundColor: "#fef2f2", // red-50
    padding: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#7f1d1d", // red-900
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#b91c1c", // red-700
  },
  table: {
    width: "100%",
    border: "1 solid #ddd",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderBottom: "1 solid #ddd",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
  },
  cell: {
    padding: 6,
    fontSize: 9,
  },
  colDue: {
    width: "15%",
    color: "#dc2626", // red-600
    fontWeight: "bold",
  },
  colCustomer: {
    width: "35%",
  },
  colNote: {
    width: "15%",
  },
  colValue: {
    width: "17.5%",
    textAlign: "right",
  },
  colPending: {
    width: "17.5%",
    textAlign: "right",
    fontWeight: "bold",
    color: "#dc2626", // red-600
  },
});

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

export function OverdueReceivablesPDF({
  rows,
  startDate,
  endDate,
  summary,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório de Contas a Receber Vencidas</Text>
        <Text style={styles.subtitle}>
          Relatório gerado a partir de: {formatDate(startDate)} {endDate ? `até ${formatDate(endDate)}` : ""}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Pendente Vencido</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalPending)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Quantidade de Títulos</Text>
            <Text style={styles.summaryValue}>
              {summary.count}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.colDue]}>Vencimento</Text>
            <Text style={[styles.cell, styles.colCustomer]}>Cliente</Text>
            <Text style={[styles.cell, styles.colNote]}>Nota</Text>
            <Text style={[styles.cell, styles.colValue]}>Total</Text>
            <Text style={[styles.cell, styles.colPending]}>Pendente</Text>
          </View>

          {rows.map((row) => {
            const total = Number(row.total ?? 0);
            const paid = Number(row.total_payed ?? 0);
            const pending = Math.max(total - paid, 0);

            return (
              <View key={row.id} style={styles.row}>
                <Text style={[styles.cell, styles.colDue]}>
                  {formatDate(row.due_date)}
                </Text>
                <Text style={[styles.cell, styles.colCustomer]}>
                  {(row.customer || "—").toUpperCase()}
                </Text>
                <Text style={[styles.cell, styles.colNote]}>
                  {row.note_number || "—"}
                </Text>
                <Text style={[styles.cell, styles.colValue]}>
                  {formatCurrency(total)}
                </Text>
                <Text style={[styles.cell, styles.colPending]}>
                  {formatCurrency(pending)}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
