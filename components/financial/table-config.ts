import { VisibilityState } from "@tanstack/react-table"

export const defaultColumnVisibility: VisibilityState = {
  issue_date: true,
  due_date: true,
  customer_or_supplier: true,
  phone: false,
  source: false,
  category: false,
  type: true,
  payment_method: true,
  payment_status: true,
  remaining: true,
  total: true,
}

export function getInitialColumnVisibility(): VisibilityState {
  if (typeof window === "undefined") return defaultColumnVisibility

  const stored = localStorage.getItem("orders_column_visibility")
  return stored ? JSON.parse(stored) : defaultColumnVisibility
}

export function persistColumnVisibility(state: VisibilityState) {
  if (typeof window !== "undefined") {
    localStorage.setItem("orders_column_visibility", JSON.stringify(state))
  }
}
