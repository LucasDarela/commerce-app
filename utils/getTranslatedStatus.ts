type SourceRecord = {
  source: "order" | "financial";
  payment_status?: "Paid" | "Unpaid" | "Partial" | string;
  status?: "Paid" | "Unpaid" | "Partial" | string;
};

export function getTranslatedStatus(record: {
  source: "order" | "financial";
  payment_status?: "Paid" | "Unpaid" | "Partial";
  status?: "Paid" | "Unpaid" | "Partial";
}): string {
  if (record.source === "order") {
    return record.payment_status === "Paid"
      ? "Pago"
      : record.payment_status === "Unpaid"
        ? "Pendente"
        : record.payment_status === "Partial"
          ? "Parcial"
          : "—";
  }

  if (record.source === "financial") {
    return record.status === "Paid"
      ? "Pago"
      : record.status === "Unpaid"
        ? "Pendente"
        : record.status === "Partial"
          ? "Parcial"
          : "—";
  }

  return "—";
}
