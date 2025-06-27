import { z } from "zod";
import { orderSchema } from "@/components/types/orderSchema";

export type Order = z.infer<typeof orderSchema>;

export type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product_id: string;
  products?: {
    name: string;
    code: string;
  } | null;
};
