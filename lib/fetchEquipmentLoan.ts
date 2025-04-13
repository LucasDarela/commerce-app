import { z } from "zod";

export const equipmentLoanSchema = z.object({
  id: z.string(),
  equipment_id: z.string(),
  customer_id: z.string(),
  company_id: z.string(),
  quantity: z.number(),
  start_date: z.string(), // ISO string
  end_date: z.string().nullable().optional(),
  status: z.enum(["active", "returned"]),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
});

export type EquipmentLoan = z.infer<typeof equipmentLoanSchema>;