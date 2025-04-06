// types/order.ts
export type Order = {
    id: string
    appointment_date: string
    appointment_hour: string
    appointment_local: string
    customer: string
    phone: string
    amount: number
    products: string
    delivery_status: "Deliver" | "Collect" | "Pending"
    payment_status: "Pending" | "Paid"
    payment_method: "Pix" | "Cash" | "Ticket" | "Card"
  }