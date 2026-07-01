// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";

  let d: Date;
  if (typeof date === "string") {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
    d = new Date(isDateOnly ? `${date}T12:00:00` : date);
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(value: number | string | null | undefined) {
  const number = typeof value === "string" ? parseFloat(value) : value;
  if (number === null || number === undefined || isNaN(number))
    return "R$ 0,00";

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
