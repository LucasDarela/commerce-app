export type Equipment = {
  id: string;
  company_id: string;
  name: string;
  type?: string | null | undefined;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  code?: string | null;
  description?: string | null;
  unit_price?: number | null;
  value?: number | null;
  stock: number;
  is_available: boolean;
  created_at: string;
};

export type EquipmentLoan = {
  id: string;
  equipment_id: string;
  customer_id: string;
  company_id: string;
  quantity: number;
  start_date: string;
  end_date?: string | null;
  status: "Deposito" | "Cliente";
  notes?: string | null;
  created_at: string;
};