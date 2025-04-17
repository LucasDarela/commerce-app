"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { fetchOrderDetails } from "@/lib/fetchOrderDetails"
import { toast } from "sonner"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { SaleMirrorPDF } from "@/components/pdf/sale-mirror"
import { Button } from "@/components/ui/button"

export default function ViewOrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Espelho da Venda</h1>
        <PDFDownloadLink
          document={<SaleMirrorPDF company={company} customer={customer} items={items} />}
          fileName={`espelho-pedido-${order.note_number}.pdf`}
        >
          {({ loading }) => (
            <Button variant="outline">
              {loading ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      {/* Fornecedor */}
      <section>
        <h2 className="font-semibold">Fornecedor</h2>
        <p><strong>{company.name}</strong></p>
        <p>{company.document}</p>
        <p>{company.address}, {company.number} - {company.neighborhood}</p>
        <p>{company.city} - {company.state}, {company.zip_code}</p>
        <p>📞 {company.phone}</p>
        <p>✉️ {company.email}</p>
      </section>

      {/* Cliente */}
      <section>
        <h2 className="font-semibold">Cliente</h2>
        <p><strong>{customer.name}</strong></p>
        <p>{customer.document}</p>
        <p>{customer.address}, {customer.number} - {customer.neighborhood}</p>
        <p>{customer.city} - {customer.state}, {customer.zip_code}</p>
        <p>📞 {customer.phone}</p>
        <p>✉️ {customer.email}</p>
      </section>

      {/* Itens */}
      <section>
        <h2 className="font-semibold">Itens da Venda</h2>
        <table className="w-full text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Produto</th>
              <th className="p-2">Qtd</th>
              <th className="p-2">V. Unitário</th>
              <th className="p-2">V. Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.product?.name}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">R$ {Number(item.price).toFixed(2)}</td>
                <td className="p-2 font-semibold">
                  R$ {(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}