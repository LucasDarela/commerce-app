"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { fetchOrderDetails } from "@/lib/fetchOrderDetails"
import { toast } from "sonner"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { ItemRelationPDF } from "@/components/pdf/item-relation-pdf"
import { Button } from "@/components/ui/button"
import { GenerateBoletoButton } from "@/components/generate-boleto-button"
import { SignatureModal } from "@/components/signature-modal"
import { supabase } from "@/lib/supabase";

export default function ViewOrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [openSignature, setOpenSignature] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

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
    await supabase
      .from("orders")
      .update({ stock_updated: true })
      .eq("id", id);
  
    // Atualiza localmente
    setSignatureData(dataUrl);
    setOpenSignature(false);
  }

  useEffect(() => {
    const fetch = async () => {
        try {
            const data = await fetchOrderDetails(id as string)
            setOrder(data)

            if (data?.customer_signature) {
              setSignatureData(data.customer_signature)
            }

          } catch (err) {
            console.error("Erro no fetchOrderDetails:", err)
            toast.error("Erro ao carregar espelho da venda.")
          }
    }
    if (id) fetch()
  }, [id])

  if (!order) return <div className="p-4">Carregando...</div>

  const company = order.company
  const customer = order.customer
  const items = order.items || []

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
    <div className="flex items-start justify-between">
      <h1 className="text-2xl font-bold">Espelho da Venda</h1>
      <div className="flex flex-col gap-2">

        {/* <PDFDownloadLink
          document={<ItemRelationPDF company={company} customer={customer} items={items} />}
          fileName={`espelho-pedido-${order.note_number}.pdf`}
        >
          {({ loading }) => (
            <Button >
              {loading ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
          )}
        </PDFDownloadLink>
        <GenerateBoletoButton
          orderId={order.id}
          paymentMethod={order.payment_method}
        /> */}
      </div>
    </div>
      {/* Cliente */}
      <section>
        <h2 className="font-semibold">Cliente</h2>
        <p><strong>{customer.name}</strong> - {customer.document}</p>
        <p>{customer.address}, {customer.number} - {customer.neighborhood}</p>
        <p>{customer.city} - {customer.state}, {customer.zip_code}</p>
        <p>📞 {customer.phone} | ✉️ {customer.email?.trim() ? customer.email : "N/A"}</p>
      </section>
      {/* Forma de Pagamento */}
      <section>
        <h2 className="font-semibold">Forma de Pagamento: <span>{order.payment_method ? order.payment_method : "N/A"}</span></h2>
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
            {items.map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">R$ {item.unit_price.toFixed(2)}</td>
                <td className="p-2 font-semibold">
                R$ {(item.quantity * item.unit_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="w-full mt-6">
        <Button className="w-full" onClick={() => setOpenSignature(true)}>
        Assinar
      </Button>
        </div>
        {signatureData && (
            <div className="flex flex-col items-center mt-4">
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
          <PDFDownloadLink document={    <ItemRelationPDF
              signature={signatureData}
              company={company}
              customer={customer}
              items={items}
              note={order.note_number}
            />} fileName="nota.pdf">
            {({ loading }) => (
              <Button variant="default" className="w-full">
                {loading ? "Gerando PDF..." : "Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>

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
    
  )
}