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
// import type { Order } from "@/components/types/orderSchema";
import type { OrderDetails } from "@/components/types/orderDetails";
import { LoanEquipmentModal } from "@/components/equipment-loan/LoanEquipmentModal";
import { ReturnEquipmentModal } from "@/components/equipment-loan/ReturnEquipmentModal";
import clsx from "clsx";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

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

  // 🔵 Modal de retorno de equipamentos
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

  // ✅ GUARDA ANTES DE USAR `order`
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

  // const handleSaveSignature = async (dataUrl: string) => {
  //   if (!dataUrl) return;

  //   if (order?.stock_updated) {
  //     toast.info("✔️ Estoque já foi atualizado para este pedido.");
  //     return;
  //   }

  //   await supabase
  //     .from("orders")
  //     .update({ customer_signature: assinaturaBase64 })
  //     .eq("id", order.id);

  //   setOrder((prev) =>
  //     prev ? { ...prev, customer_signature: assinaturaBase64 } : prev,
  //   );

  //   if (error) {
  //     toast.error("Erro ao salvar assinatura no banco.");
  //     console.error("Erro ao atualizar assinatura:", error);
  //     return;
  //   }

  //   const { data: items, error: itemsError } = await supabase
  //     .from("order_items")
  //     .select("product_id, quantity")
  //     .eq("order_id", id);

  //   if (itemsError) {
  //     console.error("Erro ao buscar itens da venda:", itemsError);
  //     toast.error("Erro ao buscar itens para atualizar estoque.");
  //     return;
  //   }

  //   for (const item of items) {
  //     const { data: product, error: productError } = await supabase
  //       .from("products")
  //       .select("stock")
  //       .eq("id", item.product_id)
  //       .single();

  //     if (productError || product?.stock == null) {
  //       console.error("Erro ao buscar produto:", productError);
  //       continue;
  //     }

  //     const novoEstoque = (product.stock ?? 0) - item.quantity;

  //     const { error: updateError } = await supabase
  //       .from("products")
  //       .update({ stock: novoEstoque })
  //       .eq("id", item.product_id);

  //     if (updateError) {
  //       console.error("Erro ao atualizar estoque:", updateError);
  //     }
  //   }

  //   toast.success("✔️ Estoque atualizado com sucesso.");
  //   await supabase.from("orders").update({ stock_updated: true }).eq("id", id);
  //   setSignatureData(dataUrl);
  //   setOpenSignature(false);
  // };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!dataUrl) return;

    // evita rodar duas vezes
    if (order?.stock_updated) {
      toast.info("✔️ Estoque já foi atualizado para este pedido.");
      return;
    }

    // 1) salva a assinatura no banco
    const { error: saveError } = await supabase
      .from("orders")
      .update({ customer_signature: dataUrl })
      .eq("id", id); // pode usar id do useParams

    if (saveError) {
      toast.error("Erro ao salvar assinatura no banco.");
      console.error("Erro ao atualizar assinatura:", saveError);
      return;
    }

    // 2) atualiza estado local imediatamente -> habilita o botão sem reload
    setOrder((prev: any) =>
      prev ? { ...prev, customer_signature: dataUrl } : prev,
    );
    setSignatureData(dataUrl);

    // 3) busca itens da venda
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Erro ao buscar itens da venda:", itemsError);
      toast.error("Erro ao buscar itens para atualizar estoque.");
      return;
    }

    // 4) atualiza estoque de cada produto
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

    toast.success("✔️ Estoque atualizado com sucesso.");

    // 5) marca a flag para não processar de novo
    await supabase.from("orders").update({ stock_updated: true }).eq("id", id);

    // 6) fecha o modal
    setOpenSignature(false);
  };

  // --------- atualização de status simples (reutilizada nos modais) ----------
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

        // seu helper atual aceita string (se você já atualizou para (supabase, order), troque a chamada)
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

      // COLETAR -> abrir modal de retorno
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

      // fallback: alternar status direto
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
      <section>
        <h2 className="font-semibold">Cliente</h2>
        <p>
          <strong>{customer.name}</strong> - {customer.document}
        </p>
        <p>
          {customer.address}, {customer.number} - {customer.neighborhood}
        </p>
        <p>
          {customer.city} - {customer.state}, {customer.zip_code}
        </p>
        <p>
          📞 {customer.phone} | ✉️{" "}
          {customer.email?.trim() ? customer.email : "N/A"}
        </p>
      </section>

      {/* Forma de Pagamento */}
      <section>
        <h2 className="font-semibold">
          Forma de Pagamento:{" "}
          <span>{order.payment_method ? order.payment_method : "N/A"}</span>
        </h2>
      </section>

      {/* Itens */}
      <section>
        <h2 className="font-semibold">Itens da Venda</h2>

        <table className="w-full text-sm border">
          <thead>
            <tr className="text-left">
              <th className="p-2">Produto</th>
              <th className="p-2">Qtd</th>
              <th className="p-2">Un</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={item.id ?? `fallback-${index}`} className="border-t">
                <td className="p-2">{item.product?.name}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">R$ {(item.price ?? 0).toFixed(2)}</td>
                <td className="p-2 font-semibold">
                  R$ {(item.quantity * (item.price ?? 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Produtos devolvidos */}
        {returnedProducts.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold">Produtos Devolvidos</h3>
            <table className="w-full text-sm border mt-2">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Produto</th>
                  <th className="p-2">Qtd Devolvida</th>
                  <th className="p-2">Un</th>
                  <th className="p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {returnedProducts.map((item, index) => {
                  const productName = item.product?.name || "Produto";
                  const unitPrice = item.unitPrice ?? 0;
                  const total = item.quantity * unitPrice;
                  return (
                    <tr key={index} className="border-t text-red-700">
                      <td className="p-2">{productName}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">R$ {unitPrice.toFixed(2)}</td>
                      <td className="p-2 font-semibold">
                        R$ {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Totais */}
        <div className="mt-6 border-t pt-4 text-sm text-right space-y-1">
          <p>
            <strong>Frete:</strong> R$ {freight.toFixed(2)}
          </p>
          <p className="text-lg font-bold">
            <strong>Total Final:</strong> R{"$ "}
            {(
              totalFinal -
              returnedProducts.reduce(
                (sum, item) => sum + item.unitPrice * item.quantity,
                0,
              )
            ).toFixed(2)}
          </p>
        </div>

        {/* Botão Assinar */}
        <div className="w-full mt-6">
          <Button className="w-full" onClick={() => setOpenSignature(true)}>
            Assinar
          </Button>
        </div>

        {/* Imagem da Assinatura */}
        {signatureData && (
          <div className="flex flex-col items-center mt-4 bg-white">
            <p className="text-sm text-gray-600 mb-2">Assinatura capturada:</p>
            <img
              src={signatureData}
              alt="Assinatura do cliente"
              className="border rounded w-64 h-auto"
            />
          </div>
        )}
      </section>

      {/* Modal de Assinatura */}
      <SignatureModal
        open={openSignature}
        onClose={() => setOpenSignature(false)}
        onSave={handleSaveSignature}
      />

      {/* Ações pós-assinatura */}
      {signatureData && (
        <div className="flex flex-col gap-4">
          {logoUrl && (
            <PDFDownloadLink
              key={JSON.stringify({ signatureData, returnedProducts, items })}
              document={
                <ItemRelationPDF
                  company={order.company}
                  customer={order.customer}
                  items={itemsForPdf}
                  note={order.note_number}
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
