"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchOrderDetails } from "@/lib/fetchOrderDetails";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ItemRelationPDF } from "@/components/pdf/item-relation-pdf";
import { Button } from "@/components/ui/button";
import { GenerateBoletoButton } from "@/components/generate-boleto-button";
import { SignatureModal } from "@/components/signature-modal";
import { supabase } from "@/lib/supabase";
import type { OrderItem } from "@/components/types/orders";
import type { Product } from "@/components/types/products";
import { getCompanyLogoAsDataUrl } from "@/components/pdf/CompanyLogoAsDataUrl";

export default function ViewOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [openSignature, setOpenSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // useEffect(() => {
  //   async function loadLogo() {
  //     const logo = await getCompanyLogoAsDataUrl(company.id); // garanta que company.id esteja disponível
  //     setLogoUrl(logo);
  //   }

  //   loadLogo();
  // }, [company.id]);

  const handleSaveSignature = async (dataUrl: string) => {
    if (!dataUrl) return;

    // ⚠️ Verifica antes se o estoque já foi atualizado
    if (order?.stock_updated) {
      toast.info("✔️ Estoque já foi atualizado para este pedido.");
      return;
    }

    // Atualiza a assinatura no banco
    const { error } = await supabase
      .from("orders")
      .update({ customer_signature: dataUrl })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao salvar assinatura no banco.");
      console.error("Erro ao atualizar assinatura:", error);
      return;
    }

    // Buscar itens da venda
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Erro ao buscar itens da venda:", itemsError);
      toast.error("Erro ao buscar itens para atualizar estoque.");
      return;
    }

    // Atualizar estoque para cada item
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError || product?.stock == null) {
        console.error("Erro ao buscar produto:", productError);
        continue;
      }

      const novoEstoque = product.stock - item.quantity;

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: novoEstoque })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Erro ao atualizar estoque:", updateError);
      }
    }

    toast.success("✔️ Estoque atualizado com sucesso.");

    // Marca como estoque processado
    await supabase.from("orders").update({ stock_updated: true }).eq("id", id);

    // Atualiza localmente
    setSignatureData(dataUrl);
    setOpenSignature(false);
  };

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
            `Erro ao buscar preço da tabela de preços (product_id: ${item.product_id}, price_table_id: ${customerData.price_table_id}):`,
            priceError,
          );
        }

        if (!priceTableItem) {
          console.warn(
            `⚠️ Nenhum preço encontrado para o produto ${item.product_id} na tabela ${customerData.price_table_id}`,
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
        console.log("🧾 Dados do pedido:", data);
        if (!data || !data.customer) return;
        setOrder(data);

        if (data?.customer_signature) {
          setSignatureData(data.customer_signature);
        }

        const devolucoes = await fetchReturnedProducts(
          id as string,
          data.customer.id,
        );
        console.log("🔄 Produtos retornados:", devolucoes);
        setReturnedProducts(devolucoes);

        const logo = await getCompanyLogoAsDataUrl(data.company.id);
        setLogoUrl(logo);
      } catch (err) {
        console.error("Erro ao carregar espelho da venda:", err);
        toast.error("Erro ao carregar espelho da venda.");
      }
    };

    if (id) fetch();
  }, [id]);

  if (!order) return <div className="p-4">Carregando...</div>;

  const company = order.company;
  const customer = order.customer;
  const items: OrderItem[] = (order.items ?? []).map((item: any) => ({
    ...item,
    product: {
      name: item.product?.name || item.product?.name || "Produto",
      code: item.product?.code || item.product?.code || "000",
    },
    price: item.price ?? 0,
  }));

  const freight = Number(order.freight || 0);
  const totalDevolucao = returnedProducts.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const totalItems = items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.price,
    0,
  );
  const totalFinal = (totalItems || 0) + (freight || 0);

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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

        {/* Tabela de produtos vendidos */}
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
            {items.map((item: any, index: number) => {
              console.log("🔍 Item:", item);
              return (
                <tr key={item.id ?? `fallback-${index}`} className="border-t">
                  <td className="p-2">{item.product?.name}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">R$ {(item.price ?? 0).toFixed(2)}</td>
                  <td className="p-2 font-semibold">
                    R$ {(item.quantity * (item.price ?? 0)).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Se houver produtos devolvidos */}
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
                  const productCode = item.product?.code || "000";
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

        {/* Calculo total final considerando devoluções */}
        <div className="mt-6 border-t pt-4 text-sm text-right space-y-1">
          <p>
            <strong>Frete:</strong> R$ {freight.toFixed(2)}
          </p>

          <p className="text-lg font-bold">
            <strong>Total Final:</strong> R${" "}
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
      {/* Só aparece depois que assinar */}
      {signatureData && (
        <div className="flex flex-col gap-2 mt-4">
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
                  freight={order.freight}
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
            <GenerateBoletoButton
              orderId={order.id}
              paymentMethod={order.payment_method}
              signatureData={signatureData}
            />
          )}
        </div>
      )}
    </div>
  );
}
