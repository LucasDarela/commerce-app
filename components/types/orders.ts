import { z } from "zod"
import { orderSchema } from "@/components/financial/schema"

export type Order = z.infer<typeof orderSchema>