"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

type OrderRow = {
  id: string;
  note_number: string | number | null;
  appointment_date: string | null;
  due_date: string | null;
  customer: string | null;
  products: string | null;
  total: number;
  total_payed: number;
  payment_status: string | null;
};

type CustomerGroup = {
  customer: string;
  rows: OrderRow[];
  totalNotes: number;
  totalOverdue: number;
};

type Props = {
  groups: CustomerGroup[];
  startDate: string;
  endDate?: string;
  summary: {
    customers: number;
    notes: number;
    totalSales: number;
    totalPaid: number;
    totalOpen: number;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    border: "1 solid #ddd",
    padding: 8,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  groupBox: {
    marginBottom: 14,
    border: "1 solid #ddd",
  },
  groupHeader: {
    padding: 8,
    backgroundColor: "#f3f3f3",
    borderBottom: "1 solid #ddd",
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  groupMeta: {
    fontSize: 8,
    color: "#555",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderBottom: "1 solid #ddd",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderTop: "1 solid #ddd",
  },
  cell: {
    padding: 5,
    fontSize: 8,
  },
  colDate: { width: "10%" },
  colDue: { width: "10%" },
  colNote: { width: "8%" },
  colProducts: { width: "28%" },
  colStatus: { width: "12%" },
  colPaid: { width: "10%", textAlign: "right" },
  colRemaining: { width: "10%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },
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
    case "Unpaid":
      return "Não Pago";
    case "Partial":
      return "Parcial";
    default:
      return status || "—";
  }
}

export function SalesGroupedByCustomerPDF({
  groups,
  startDate,
  endDate,
  summary,
}: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Relatório de Vendas Agrupadas por Cliente</Text>
        <Text style={styles.subtitle}>
          Período: {formatDate(startDate)}
          {endDate ? ` até ${formatDate(endDate)}` : ""}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Clientes</Text>
            <Text style={styles.summaryValue}>{summary.customers}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Notas</Text>
            <Text style={styles.summaryValue}>{summary.notes}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total das notas</Text>
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

        {groups.map((group) => (
          <View key={group.customer} style={styles.groupBox} wrap={false}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.customer}</Text>
              <Text style={styles.groupMeta}>
                {group.rows.length} nota(s) • Total das notas:{" "}
                {formatCurrency(group.totalNotes)} • Total vencido:{" "}
                {formatCurrency(group.totalOverdue)}
              </Text>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.colDate]}>Data</Text>
              <Text style={[styles.cell, styles.colDue]}>Vencimento</Text>
              <Text style={[styles.cell, styles.colNote]}>Nota</Text>
              <Text style={[styles.cell, styles.colProducts]}>Produtos</Text>
              <Text style={[styles.cell, styles.colStatus]}>Status</Text>
              <Text style={[styles.cell, styles.colPaid]}>Pago</Text>
              <Text style={[styles.cell, styles.colRemaining]}>Restante</Text>
              <Text style={[styles.cell, styles.colTotal]}>Total</Text>
            </View>

            {group.rows.map((row) => {
              const remaining = Math.max(
                Number(row.total) - Number(row.total_payed),
                0,
              );

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
                  <Text style={[styles.cell, styles.colProducts]}>
                    {row.products || "—"}
                  </Text>
                  <Text style={[styles.cell, styles.colStatus]}>
                    {translatePaymentStatus(row.payment_status)}
                  </Text>
                  <Text style={[styles.cell, styles.colPaid]}>
                    {formatCurrency(row.total_payed)}
                  </Text>
                  <Text style={[styles.cell, styles.colRemaining]}>
                    {formatCurrency(remaining)}
                  </Text>
                  <Text style={[styles.cell, styles.colTotal]}>
                    {formatCurrency(row.total)}
                  </Text>
                </View>
              );
            })}

            <View style={styles.totalRow}>
              <Text style={[styles.cell, { width: "56%", fontWeight: "bold" }]}>
                Totais do cliente
              </Text>
              <Text style={[styles.cell, styles.colPaid]} />
              <Text style={[styles.cell, styles.colRemaining, { fontWeight: "bold" }]}>
                {formatCurrency(group.totalOverdue)}
              </Text>
              <Text style={[styles.cell, styles.colTotal, { fontWeight: "bold" }]}>
                {formatCurrency(group.totalNotes)}
              </Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}