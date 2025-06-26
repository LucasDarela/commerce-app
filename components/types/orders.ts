import { z } from "zod";
import { orderSchema } from "@/components/types/orderSchema";

export type Order = z.infer<typeof orderSchema>;
