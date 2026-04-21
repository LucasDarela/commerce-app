"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type Column = {
  label: string;
  key: string;
  width: string;
  align?: "left" | "right" | "center";
};

export type SummaryItem = {
  label: string;
  value: string;
};

type Props = {
  title: string;
  subtitle: string;
  columns: Column[];
  data: any[];
  summary?: SummaryItem[];
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "bold",
    color: "#111",
  },
  subtitle: {
    fontSize: 9,
    marginBottom: 16,
    color: "#666",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  summaryBox: {
    minWidth: 100,
    border: "1 solid #e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  table: {
    width: "100%",
    border: "1 solid #e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottom: "1 solid #e2e8f0",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #f1f5f9",
  },
  cell: {
    padding: 6,
  },
  cellText: {
    fontSize: 8,
  },
});

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return "—";
  return path.split(".").reduce((acc, part) => acc && acc[part], obj) ?? "—";
}

export function GenericReportPDF({
  title,
  subtitle,
  columns,
  data,
  summary,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation={columns.length > 6 ? "landscape" : "portrait"}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {summary && summary.length > 0 && (
          <View style={styles.summaryRow}>
            {summary.map((item, idx) => (
              <View key={idx} style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.headerRow}>
            {columns.map((col, idx) => (
              <View
                key={idx}
                style={[
                  styles.cell,
                  { width: col.width },
                ]}
              >
                <Text style={[styles.cellText, { fontWeight: "bold", textAlign: col.align || "left" }]}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {data.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {columns.map((col, colIdx) => (
                <View
                  key={colIdx}
                  style={[
                    styles.cell,
                    { width: col.width },
                  ]}
                >
                  <Text style={[styles.cellText, { textAlign: col.align || "left" }]}>
                    {String(getNestedValue(row, col.key))}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {data.length === 0 && (
          <Text style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
            Nenhum dado encontrado para os filtros selecionados.
          </Text>
        )}
      </Page>
    </Document>
  );
}
