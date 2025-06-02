type SourceRecord = {
    source: "order" | "financial"
    payment_status?: "Paid" | "Unpaid" | string
    status?: "Paid" | "Unpaid" | string
  }
  
  export function getTranslatedStatus(record: {
    source: "order" | "financial"
    payment_status?: "Paid" | "Unpaid"
    status?: "Paid" | "Unpaid"
  }): string {
    if (record.source === "order") {
      return record.payment_status === "Paid"
        ? "Pago"
        : record.payment_status === "Unpaid"
        ? "Pendente"
        : "—"
    }
  
    if (record.source === "financial") {
      return record.status === "Paid"
        ? "Pago"
        : record.status === "Unpaid"
        ? "Pendente"
        : "—"
    }
  
    return "—"
  }