export type OverdueItem = {
  order_id: string;
  note_number: string;
  due_date: string | null;
  total: number | null;
  payment_status: string | null;
};
