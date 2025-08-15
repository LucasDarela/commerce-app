// components/types/orderDetails.ts
export type OrderDetails = {
  id: string;
  payment_method: string;
  payment_status?: "Paid" | "Unpaid";
  days_ticket?: number | string;
  freight?: number | string | null;
  note_number?: string;
  customer_signature?: string | null;
  document_type: string | null;
  // usado no PDF/logo:
  company: { id: string; name?: string };

  // a view usa estes campos do cliente:
  customer: {
    id: string;
    name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    number?: string | number | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  };

  // itens já resolvidos (não o order_items cru):
  items: Array<{
    id?: string;
    quantity: number;
    price: number;
    product?: {
      name?: string;
      code?: string | number;
    };
  }>;

  // outros usados na página:
  total: number;
  delivery_status: "Entregar" | "Coletar" | "Coletado";
  created_by?: string;
  stock_updated?: boolean;

  // fallback para helpers
  products: string;
};
