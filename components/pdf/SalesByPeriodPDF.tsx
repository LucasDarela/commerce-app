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
  note_number: string | number | null;
  appointment_date: string | null;
  due_date: string | null;
  customer: string | null;
  products: string | null;
  total: number | null;
  total_payed: number | null;
  payment_status: string | null;
};

type Props = {
  rows: Row[];
  startDate: string;
  endDate?: string;
  summary: {
    count: number;
    totalSales: number;
    totalPaid: number;
    totalOpen: number;
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
    border: "1 solid #ddd",
    padding: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
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
  colDate: {
    width: "10%",
  },
  colDue: {
    width: "10%",
  },
  colNote: {
    width: "8%",
  },
  colCustomer: {
    width: "18%",
  },
  colProducts: {
    width: "22%",
  },
  colValue: {
    width: "10%",
    textAlign: "right",
  },
  colStatus: {
    width: "12%",
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

function translatePaymentStatus(status: string | null) {
  switch (status) {
    case "Paid":
      return "Pago";
    case "Pending":
      return "Não Pago";
    case "Unpaid":
      return "Não Pago";
    case "Partial":
      return "Parcial";
    default:
      return status || "—";
  }
}

export function SalesByPeriodPDF({
  rows,
  startDate,
  endDate,
  summary,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.title}>Relatório de Vendas por Período</Text>
        <Text style={styles.subtitle}>
          Período: {formatDate(startDate)} {endDate ? `até ${formatDate(endDate)}` : ""}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total de vendas</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalSales)}
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total recebido</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalPaid)}
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total em aberto</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalOpen)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.colDate]}>Data</Text>
            <Text style={[styles.cell, styles.colDue]}>Venc.</Text>
            <Text style={[styles.cell, styles.colNote]}>Nota</Text>
            <Text style={[styles.cell, styles.colCustomer]}>Cliente</Text>
            <Text style={[styles.cell, styles.colProducts]}>Produtos</Text>
            <Text style={[styles.cell, styles.colValue]}>Total</Text>
            <Text style={[styles.cell, styles.colValue]}>Pago</Text>
            <Text style={[styles.cell, styles.colValue]}>Restante</Text>
            <Text style={[styles.cell, styles.colStatus]}>Status</Text>
          </View>

          {rows.map((row) => {
            const total = Number(row.total ?? 0);
            const paid = Number(row.total_payed ?? 0);
            const remaining = Math.max(total - paid, 0);

            return (
              <View key={row.id} style={styles.row}>
                <Text style={[styles.cell, styles.colDate]}>
                  {formatDate(row.appointment_date)}
                </Text>
                <Text style={[styles.cell, styles.colDue]}>
                  {formatDate(row.due_date)}
                </Text>
                <Text style={[styles.cell, styles.colNote]}>
                  {row.note_number ?? "—"}
                </Text>
                <Text style={[styles.cell, styles.colCustomer]}>
                  {row.customer || "—"}
                </Text>
                <Text style={[styles.cell, styles.colProducts]}>
                  {row.products || "—"}
                </Text>
                <Text style={[styles.cell, styles.colValue]}>
                  {formatCurrency(total)}
                </Text>
                <Text style={[styles.cell, styles.colValue]}>
                  {formatCurrency(paid)}
                </Text>
                <Text style={[styles.cell, styles.colValue]}>
                  {formatCurrency(remaining)}
                </Text>
                <Text style={[styles.cell, styles.colStatus]}>
                  {translatePaymentStatus(row.payment_status)}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}