"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchOrderDetails } from "@/lib/fetchOrderDetails";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ItemRelationPDF } from "@/components/pdf/item-relation-pdf";
import { Button } from "@/components/ui/button";
import { GenerateBoletoButtons } from "@/components/generate-boleto-button";
import { SignatureModal } from "@/components/signature-modal";
import { supabase } from "@/lib/supabase";
import type { OrderItem } from "@/components/types/orders";
import { getCompanyLogoAsDataUrl } from "@/components/pdf/CompanyLogoAsDataUrl";
import { fetchEquipmentsForOrderProducts } from "@/lib/fetch-equipments-for-products";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderDetails } from "@/components/types/orderDetails";
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal";
import { ReturnEquipmentModal } from "@/components/equipment-loan/ReturnEquipmentModal";
import clsx from "clsx";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import EmitNfeButton from "@/components/nf/EmitirNfeViewPage";
import { useCanEmitNfe } from "@/hooks/useCanEmitNfe";
import dayjs from "dayjs";

// --------- helpers de estoque ----------
async function parseProductsWithIds(
  supabaseClient: SupabaseClient,
  products: string,
): Promise<{ id: number; quantity: number }[]> {
  if (!products) return [];
  const parsed = products.split(",").map((entry) => {
    const match = entry.trim().match(/^(.+?) \((\d+)x\)$/);
    if (!match) return { name: entry.trim(), quantity: 1 };
    const [, name, quantity] = match;
    return { name: name.trim(), quantity: Number(quantity) };
  });

  const names = parsed.map((p) => p.name);
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name")
    .in("name", names);

  if (error || !data) return [];

  return parsed
    .map((p) => {
      const hit = data.find((d) => d.name === p.name);
      return { id: hit?.id ?? 0, quantity: p.quantity };
    })
    .filter((p) => p.id !== 0);
}

async function updateStockBasedOnOrder(
  supabaseClient: SupabaseClient,
  order: OrderDetails,
) {
  const items = await parseProductsWithIds(supabaseClient, order.products);
  for (const item of items) {
    await supabaseClient.rpc("decrement_stock", {
      product_id: item.id,
      quantity: item.quantity,
    });
  }
}

// --------- helpers de cliente/botão ----------
async function resolveCustomer(
  supabaseClient: SupabaseClient,
  ord: any,
): Promise<{ id: string; name: string } | null> {
  if (ord?.customer?.id) {
    const { data } = await supabaseClient
      .from("customers")
      .select("id, name")
      .eq("id", ord.customer.id)
      .maybeSingle();
    if (data) return data;
  }

  const rawName =
    typeof ord.customer === "string" ? ord.customer : ord.customer?.name;
  if (!rawName) return null;

  let q = supabaseClient.from("customers").select("id, name");
  if (ord.company?.id || ord.company_id) {
    q = q.eq("company_id", ord.company?.id ?? ord.company_id);
  }

  const { data: exact } = await q.eq("name", rawName).limit(1);
  if (exact?.length) return exact[0];

  const { data: like } = await supabaseClient
    .from("customers")
    .select("id, name")
    .ilike("name", `%${rawName}%`)
    .limit(1);

  return like?.[0] ?? null;
}

function getDeliveryButtonLabel(status?: string) {
  if (status === "Entregar") return "Marcar como Entregue";
  if (status === "Coletar") return "Coletar Itens";
  if (status === "Coletado") return "Chopp já Coletado ✅";
  return "Atualizar Status";
}

export default function ViewOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [openSignature, setOpenSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 🟡 Modal de comodato (empréstimo)
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [initialLoanCustomer, setInitialLoanCustomer] = useState<{
    id: string;
    name: string;
  }>();
  const [initialLoanItems, setInitialLoanItems] =
    useState<{ equipment_id: string; name: string; quantity: number }[]>();

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnModalCustomerId, setReturnModalCustomerId] = useState<
    string | null
  >(null);
  const [returnEquipmentItems, setReturnEquipmentItems] = useState<
    { loanId: string; equipmentName: string; quantity: number }[]
  >([]);

  const fetchReturnedProducts = async (orderId: string, customerId: string) => {
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("price_table_id")
      .eq("id", customerId)
      .single();

    if (customerError || !customerData) {
      console.error("Erro ao buscar price_table_id:", customerError);
      return [];
    }

    const { data: stockMovements, error: stockError } = await supabase
      .from("stock_movements")
      .select(
        `
        quantity,
        product_id,
        product:products ( name, code )
      `,
      )
      .eq("note_id", orderId)
      .eq("type", "return");

    if (stockError || !stockMovements) {
      console.error("Erro ao buscar stock_movements:", stockError);
      return [];
    }

    const devolucaoComPreco = await Promise.all(
      stockMovements.map(async (item) => {
        const { data: priceTableItem, error: priceError } = await supabase
          .from("price_table_products")
          .select("price")
          .eq("price_table_id", customerData.price_table_id)
          .eq("product_id", item.product_id)
          .single();

        if (priceError) {
          console.error(
            `Erro ao buscar preço (product_id: ${item.product_id}, price_table_id: ${customerData.price_table_id}):`,
            priceError,
          );
        }

        return {
          ...item,
          unitPrice: priceTableItem?.price ?? 0,
        };
      }),
    );

    return devolucaoComPreco;
  };

  const [returnedProducts, setReturnedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await fetchOrderDetails(id as string);
        if (!data || !data.customer) return;
        setOrder(data);

        const { data: customerEmit, error: emitError } = await supabase
          .from("customers")
          .select("emit_nf")
          .eq("id", data.customer.id)
          .single();

        if (!emitError && customerEmit) {
          setOrder((prev: any) =>
            prev
              ? {
                  ...prev,
                  customer: { ...prev.customer, emit_nf: customerEmit.emit_nf },
                }
              : prev,
          );
        }

        if (data?.customer_signature) {
          setSignatureData(data.customer_signature);
        }

        const devolucoes = await fetchReturnedProducts(
          id as string,
          data.customer.id,
        );
        setReturnedProducts(devolucoes);

        const logo = await getCompanyLogoAsDataUrl(data.company?.id ?? null);
        setLogoUrl(logo);
      } catch (err) {
        console.error("Erro ao carregar espelho da venda:", err);
        toast.error("Erro ao carregar espelho da venda.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetch();
  }, [id]);

  // chama o hook sempre — passa nulls enquanto order não existe
  const {
    canEmit,
    loading: canEmitLoading,
    error: canEmitError,
  } = useCanEmitNfe({
    customerId: order?.customer?.id ?? null,
    emitNfFromOrder: order?.emit_nf ?? null,
    emitNfFromCustomer: order?.customer?.emit_nf ?? null,
  });

  if (loading || !order) {
    return <TableSkeleton />;
  }

  const customer = order.customer;
  const items: OrderItem[] = (order.items ?? []).map((item: any) => ({
    ...item,
    product: {
      name: item.product?.name || "Produto",
      code: item.product?.code || "000",
    },
    price: item.price ?? 0,
  }));

  const freight = Number(order.freight ?? 0);
  const totalItems = items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.price,
    0,
  );
  const totalFinal = totalItems + freight;

  const itemsForPdf = (order.items ?? []).map((item: any) => ({
    name: item.product?.name ?? "Produto",
    code: item.product?.code ?? "000",
    quantity: item.quantity,
    unit_price: item.price ?? 0,
  }));

  const returnedItemsForPdf = returnedProducts.map((item) => ({
    name: item.product?.name ?? "Produto",
    code: item.product?.code ?? "000",
    quantity: item.quantity,
    unit_price: item.unitPrice ?? 0,
  }));

  const handleSaveSignature = async (dataUrl: string) => {
    if (!dataUrl) return;

    if (signatureData) {
      const confirmReplace = confirm(
        "Deseja substituir a assinatura existente?",
      );
      if (!confirmReplace) return;
    }

    const { error: saveError } = await supabase
      .from("orders")
      .update({ customer_signature: dataUrl })
      .eq("id", id);

    if (saveError) {
      toast.error("Erro ao salvar assinatura no banco.");
      console.error("Erro ao atualizar assinatura:", saveError);
      return;
    }
    toast.success("Assinatura salva com sucesso!");
    setOrder((prev: any) =>
      prev ? { ...prev, customer_signature: dataUrl } : prev,
    );
    setSignatureData(dataUrl);
    setOpenSignature(false);

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Erro ao buscar itens da venda:", itemsError);
      toast.error("Erro ao buscar itens para atualizar estoque.");
      return;
    }

    for (const item of items ?? []) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError || product?.stock == null) {
        console.error("Erro ao buscar produto:", productError);
        continue;
      }

      const novoEstoque = (product.stock ?? 0) - item.quantity;

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: novoEstoque })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Erro ao atualizar estoque:", updateError);
      }
    }
    await supabase.from("orders").update({ stock_updated: true }).eq("id", id);
    setOpenSignature(false);
  };

  const markOrderStatus = async (next: "Coletar" | "Coletado") => {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_status: next })
      .eq("id", order.id);

    if (error) {
      toast.error("Erro ao atualizar status.");
      return false;
    }

    setOrder((prev: any) => (prev ? { ...prev, delivery_status: next } : prev));
    toast.success(`Status atualizado para ${next}.`);
    return true;
  };

  const isDeliveryDisabled =
    !order?.customer_signature || order?.delivery_status === "Coletado";
  const deliveryLabel = getDeliveryButtonLabel(order?.delivery_status);

  const handleDeliveryClick = async () => {
    if (!order || !order.id) {
      toast.error("Pedido inválido (sem ID).");
      return;
    }

    if (order.delivery_status === "Coletado") return;

    if (!order.customer_signature) {
      toast.warning(
        "⚠️ O cliente precisa assinar antes de marcar como entregue.",
      );
      return;
    }
    try {
      // ENTREGAR -> abrir modal com itens vinculados
      if (order.delivery_status === "Entregar") {
        const productsStr =
          (order.items ?? [])
            .map(
              (it: any) => `${it.product?.name ?? "Produto"} (${it.quantity}x)`,
            )
            .join(", ") ||
          order.products ||
          "";

        const equipmentItems =
          await fetchEquipmentsForOrderProducts(productsStr);

        const customer = await resolveCustomer(supabase, order);
        if (!customer) {
          toast.error("Cliente não encontrado na tabela de clientes.");
          return;
        }

        setInitialLoanCustomer({ id: customer.id, name: customer.name });
        setInitialLoanItems(equipmentItems);
        setIsLoanModalOpen(true);
        return;
      }

      if (order.delivery_status === "Coletar") {
        const customer = await resolveCustomer(supabase, order);
        if (!customer) {
          toast.error("Cliente não encontrado na tabela de clientes.");
          return;
        }

        const { data: loans, error } = await supabase
          .from("equipment_loans")
          .select("id, quantity, equipment:equipment_id(name)")
          .eq("customer_id", customer.id)
          .eq("status", "active");

        if (error || !loans) {
          toast.error("Erro ao buscar itens para retorno");
          return;
        }

        const formatted = (loans ?? []).map((loan: any) => ({
          loanId: loan.id,
          equipmentName: loan.equipment?.name || "Equipamento",
          quantity: loan.quantity,
        }));

        if (formatted.length === 0) {
          toast.warning("Nenhum item de empréstimo encontrado para retornar.");
          return;
        }

        setReturnModalCustomerId(customer.id);
        setReturnEquipmentItems(formatted);
        setIsReturnModalOpen(true);
        return;
      }

      const next =
        order.delivery_status === "Entregar" ? "Coletar" : "Coletado";

      const { error } = await supabase
        .from("orders")
        .update({ delivery_status: next })
        .eq("id", order.id);

      if (error) {
        toast.error("Erro ao atualizar status.");
        return;
      }

      if (next === "Coletado") {
        await updateStockBasedOnOrder(supabase, order);
      }

      setOrder((prev: any) =>
        prev ? { ...prev, delivery_status: next } : prev,
      );
      toast.success(`Status atualizado para ${next}.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar ação.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 mb-8">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Espelho da Venda</h1>
      </div>

      {/* Cliente */}
      <section className=" p-4 space-y-4 text-sm">
        {/* Linha 1: Pedido */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p>
            <span className="font-semibold">Nota:</span>{" "}
            {order.note_number ?? "—"}
          </p>

          <p>
            <span className="font-semibold">Data agendada:</span>{" "}
            {order.appointment_date
              ? dayjs(order.appointment_date).format("DD/MM/YYYY")
              : "—"}
          </p>

          <p>
            <span className="font-semibold">Local:</span>{" "}
            {order.appointment_local?.trim() ? order.appointment_local : "—"}
          </p>

          <p>
            <span className="font-semibold">Pagamento:</span>{" "}
            {order.payment_method ? order.payment_method : "N/A"}
          </p>
        </div>

        {/* Linha 2: Cliente (grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="font-semibold">Cliente</p>
            <p>
              <span className="font-semibold">{customer.name}</span>{" "}
              <span className="text-muted-foreground">
                • {customer.document}
              </span>
            </p>
            <p className="text-muted-foreground">
              {customer.address}, {customer.number} - {customer.neighborhood}
            </p>
            <p className="text-muted-foreground">
              {customer.city} - {customer.state}, {customer.zip_code}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Contato</p>
            <p className="text-muted-foreground">📞 {customer.phone}</p>
            <p className="text-muted-foreground">
              ✉️ {customer.email?.trim() ? customer.email : "N/A"}
            </p>
          </div>
        </div>

        {/* Observações */}
        <div className="pt-1">
          <p className="font-semibold">Observações:</p>
          <p className="text-muted-foreground">
            {order.text_note?.trim() ? order.text_note : "—"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Itens da Venda</h2>
          <p className="text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </p>
        </div>

        {/* Tabela Itens */}
        <div className="rounded-md border overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-2 font-semibold">Produto</th>
                  <th className="p-2 font-semibold w-[80px] hidden sm:table-cell">
                    Qtd
                  </th>
                  <th className="p-2 font-semibold w-[120px] text-right hidden sm:table-cell">
                    Un
                  </th>
                  <th className="p-2 font-semibold w-[140px] text-right hidden sm:table-cell">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item: any, index: number) => {
                  const qty = Number(item.quantity ?? 0);
                  const unit = Number(item.price ?? 0);
                  const lineTotal = qty * unit;

                  return (
                    <tr
                      key={item.id ?? `fallback-${index}`}
                      className="border-t hover:bg-muted/30"
                    >
                      {/* Produto */}
                      <td className="p-2 align-top">
                        <p className="font-medium leading-snug break-words">
                          {item.product?.name}
                        </p>

                        {/* MOBILE: layout legível (2 colunas + total em linha inteira) */}
                        <div className="mt-2 sm:hidden">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Qtd: {qty}</span>
                            <span className="text-right">
                              Un: R$ {unit.toFixed(2)}
                            </span>

                            <span className="col-span-2 flex items-center justify-between pt-1 border-t">
                              <span>Total</span>
                              <span className="font-semibold text-foreground">
                                R$ {lineTotal.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* DESKTOP */}
                      <td className="p-2 hidden sm:table-cell">{qty}</td>

                      <td className="p-2 text-right hidden sm:table-cell">
                        R$ {unit.toFixed(2)}
                      </td>

                      <td className="p-2 text-right font-semibold hidden sm:table-cell">
                        R$ {lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtos devolvidos */}
        {returnedProducts.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Produtos Devolvidos</h3>
              <p className="text-muted-foreground">
                {returnedProducts.length}{" "}
                {returnedProducts.length === 1 ? "registro" : "registros"}
              </p>
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-destructive/5">
                    <tr className="text-left">
                      <th className="p-2 font-semibold">Produto</th>
                      <th className="p-2 font-semibold w-[120px] hidden sm:table-cell">
                        Qtd Devolvida
                      </th>
                      <th className="p-2 font-semibold w-[120px] text-right hidden sm:table-cell">
                        Un
                      </th>
                      <th className="p-2 font-semibold w-[140px] text-right hidden sm:table-cell">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {returnedProducts.map((item: any, index: number) => {
                      const productName = item.product?.name || "Produto";
                      const qty = Number(item.quantity ?? 0);
                      const unit = Number(item.unitPrice ?? 0);
                      const lineTotal = qty * unit;

                      return (
                        <tr
                          key={index}
                          className="border-t text-destructive hover:bg-destructive/5"
                        >
                          {/* Produto */}
                          <td className="p-2 align-top">
                            <p className="font-medium leading-snug break-words">
                              {productName}
                            </p>

                            {/* MOBILE: mesmo padrão do bloco de itens */}
                            <div className="mt-2 sm:hidden">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <span>Qtd: {qty}</span>
                                <span className="text-right">
                                  Un: R$ {unit.toFixed(2)}
                                </span>

                                <span className="col-span-2 flex items-center justify-between pt-1 border-t border-destructive/20">
                                  <span>Total</span>
                                  <span className="font-semibold">
                                    R$ {lineTotal.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* DESKTOP */}
                          <td className="p-2 hidden sm:table-cell">{qty}</td>

                          <td className="p-2 text-right hidden sm:table-cell">
                            R$ {unit.toFixed(2)}
                          </td>

                          <td className="p-2 text-right font-semibold hidden sm:table-cell">
                            R$ {lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">Frete:</span> R${" "}
              {freight.toFixed(2)}
            </p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-lg font-bold">
              Total Final:{" "}
              <span>
                R${" "}
                {(
                  totalFinal -
                  returnedProducts.reduce(
                    (sum: number, item: any) =>
                      sum + item.unitPrice * item.quantity,
                    0,
                  )
                ).toFixed(2)}
              </span>
            </p>
            {returnedProducts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                (Total já com devoluções descontadas)
              </p>
            )}
          </div>
        </div>

        {/* Botão Assinar */}
        <div className="pt-2">
          <Button className="w-full" onClick={() => setOpenSignature(true)}>
            {signatureData ? "Refazer Assinatura" : "Assinar"}
          </Button>

          {/* Imagem da Assinatura */}
          {signatureData && (
            <div className="mt-4 rounded-md border p-3 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Assinatura capturada:
              </p>
              <img
                src={signatureData}
                alt="Assinatura do cliente"
                className="border rounded w-64 h-auto bg-white"
              />
            </div>
          )}
        </div>
      </section>

      {/* Modal de Assinatura */}
      <SignatureModal
        open={openSignature}
        onClose={() => setOpenSignature(false)}
        onSave={handleSaveSignature}
      />

      {/* Ações pós-assinatura */}
      {signatureData && (
        <div className="flex flex-col gap-4 mb-4">
          {logoUrl && (
            <PDFDownloadLink
              key={JSON.stringify({ signatureData, returnedProducts, items })}
              document={
                <ItemRelationPDF
                  company={order.company}
                  customer={order.customer}
                  items={itemsForPdf}
                  note={{
                    note_number: order.note_number,
                    appointment_date: order.appointment_date, // ✅ aqui
                  }}
                  logoUrl={logoUrl}
                  signature={order.customer_signature}
                  freight={Number(order.freight ?? 0)}
                  returnedProducts={returnedItemsForPdf}
                />
              }
              fileName={`${order.note_number} - ${customer.name}.pdf`.replace(
                /[\/\\:*?"<>|]/g,
                "",
              )}
            >
              {({ loading }) => (
                <Button variant="default" className="w-full">
                  {loading ? "Gerando PDF..." : "Download PDF"}
                </Button>
              )}
            </PDFDownloadLink>
          )}

          {order.payment_method?.toLowerCase() === "boleto" && (
            <GenerateBoletoButtons
              orderId={order.id}
              paymentMethod={order.payment_method}
              signatureData={signatureData}
            />
          )}
          {/* Botão de Entregar/Coletar/Coletado */}
          <Button
            className={clsx("w-full", {
              "bg-muted text-muted-foreground cursor-not-allowed opacity-60":
                isDeliveryDisabled,
            })}
            disabled={isDeliveryDisabled}
            onClick={handleDeliveryClick}
          >
            {deliveryLabel}
          </Button>

          {/* Botao nfe */}
          <EmitNfeButton
            orderId={order?.id ?? ""}
            customerId={order?.customer?.id ?? ""}
            emitNfFromOrder={order?.emit_nf ?? null}
            emitNfFromCustomer={order?.customer?.emit_nf ?? null}
          />
        </div>
      )}

      {/* Modais */}
      <LoanEquipmentModal
        open={isLoanModalOpen}
        onOpenChange={setIsLoanModalOpen}
        initialCustomer={initialLoanCustomer}
        initialItems={initialLoanItems}
        onLoanSaved={async () => {
          setIsLoanModalOpen(false);
          await markOrderStatus("Coletar");
        }}
      />

      <ReturnEquipmentModal
        open={isReturnModalOpen}
        onOpenChange={setIsReturnModalOpen}
        customerId={returnModalCustomerId}
        items={returnEquipmentItems}
        order={order}
        user={{ id: order?.created_by }}
        onReturnSuccess={async () => {
          setIsReturnModalOpen(false);
          await updateStockBasedOnOrder(supabase, order);
          await markOrderStatus("Coletado");
        }}
        onOpenProductReturnModal={() => {}}
      />
    </div>
  );
}
