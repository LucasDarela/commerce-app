// lib/fetchOrderDetails.ts
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { OrderDetails } from "@/components/types/orderDetails";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    code: string | number;
  };
};

type CompanyRow = {
  id: string;
  name: string | null;
  trade_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  number: string | number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  fantasy_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  zip_code: string | null;
  address: string | null;
  number: string | number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  state_registration: string | null;
  emit_nf?: boolean | null;
};

type ProductRow = {
  name: string | null;
  code: string | number | null;
};

type OrderItemRow = {
  id: string;
  quantity: number;
  price: number;
  product?: ProductRow | ProductRow[] | null;
};

function toPaidEnum(v: unknown): "Paid" | "Unpaid" | "Partial" {
  const s = String(v ?? "").toLowerCase();
  return s === "paid" ? "Paid" : s === "unpaid" ? "Unpaid" : "Partial";
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchOrderDetails(
  orderId: string,
  companyId: string,
): Promise<OrderDetails | null> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      company_id,
      customer_id,
      note_number,
      appointment_date,
      appointment_local,
      text_note,
      document_type,
      customer_signature,
      freight,
      total,
      payment_method,
      delivery_status,
      payment_status,
      products,
      stock_updated,
      customers:customers(
        id,
        name,
        fantasy_name,
        document,
        phone,
        email,
        zip_code,
        address,
        number,
        neighborhood,
        city,
        state,
        complement,
        state_registration,
        emit_nf
      ),
      company:companies!fk_company_id(
        id,
        name,
        trade_name,
        document,
        email,
        phone,
        address,
        number,
        neighborhood,
        city,
        state,
        zip_code
      ),
      order_items(
        id,
        quantity,
        price,
        product:products!order_items_product_id_fkey(
          name,
          code
        )
      )
    `)
    .eq("id", orderId)
    .eq("company_id", companyId)
    .maybeSingle();

if (error) {
  console.error("Erro ao buscar detalhes do pedido:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
  return null;
}

  if (!data) {
    return null;
  }

  const company = firstOrNull<CompanyRow>((data as any).company);
  const customer = firstOrNull<CustomerRow>((data as any).customers);

  return {
    id: data.id,
    company: {
      id: company?.id ?? "",
      name: company?.name ?? null,
      trade_name: company?.trade_name ?? company?.name ?? null,
      document: company?.document ?? null,
      email: company?.email ?? null,
      phone: company?.phone ?? null,
      address: company?.address ?? null,
      number: company?.number ?? null,
      neighborhood: company?.neighborhood ?? null,
      city: company?.city ?? null,
      state: company?.state ?? null,
      zip_code: company?.zip_code ?? null,
    },
    customer: {
      id: customer?.id ?? "",
      name: customer?.name ?? "Cliente",
      fantasy_name: customer?.fantasy_name ?? null,
      document: customer?.document ?? null,
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      zip_code: customer?.zip_code ?? null,
      address: customer?.address ?? null,
      number: customer?.number ?? null,
      neighborhood: customer?.neighborhood ?? null,
      city: customer?.city ?? null,
      state: customer?.state ?? null,
      complement: customer?.complement ?? null,
      state_registration: customer?.state_registration ?? null,
      emit_nf: customer?.emit_nf ?? null,
    },
    note_number: data.note_number ?? undefined,
    appointment_date: data.appointment_date ?? null,
    appointment_local: data.appointment_local ?? null,
    text_note: data.text_note ?? null,
    document_type: data.document_type ?? null,
    customer_signature: data.customer_signature ?? null,
    freight: data.freight ?? null,
    total: data.total,
    payment_method: data.payment_method,
    delivery_status: data.delivery_status,
    payment_status: toPaidEnum(data.payment_status),
    items: ((data.order_items ?? []) as OrderItemRow[]).map(
      (item): OrderItem => {
        const product = firstOrNull<ProductRow>(item.product);

        return {
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          product: {
            name: product?.name ?? "Produto",
            code: product?.code ?? "000",
          },
        };
      },
    ),
    products: String(data.products ?? ""),
    stock_updated: data.stock_updated ?? undefined,
  };
}