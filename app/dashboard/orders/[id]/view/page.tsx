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

export default function ViewOrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [openSignature, setOpenSignature] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const handleSaveSignature = (dataUrl: string) => {
    if (!dataUrl) return

    setSignatureData(dataUrl)
    setOpenSignature(false)
  }

  useEffect(() => {
    const fetch = async () => {
        try {
            const data = await fetchOrderDetails(id as string)
            setOrder(data)
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
        <Button onClick={() => setOpenSignature(true)}>
        Assinar
      </Button>
        </div>
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
            />} fileName="nota.pdf">
            {({ loading }) => (
              <Button variant="default">
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