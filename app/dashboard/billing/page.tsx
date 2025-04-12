"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useState } from "react"

export default function BillingPage() {
  const [card, setCard] = useState({
    name: "Lucas Andrade",
    number: "4242 4242 4242 4242",
    expiry: "12/26",
    cvc: "123"
  })

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCard({ ...card, [name]: value })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Gerenciador de Pagamentos</h1>

      {/* Card Section */}
      <Card>
        <CardHeader>
          <CardTitle>Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cartão</Label>
            <Input id="name" name="name" value={card.name} onChange={handleCardChange} placeholder="Nome como está no cartão" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número do Cartão</Label>
              <Input id="number" name="number" value={card.number} onChange={handleCardChange} placeholder="XXXX XXXX XXXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input id="expiry" name="expiry" value={card.expiry} onChange={handleCardChange} placeholder="MM/AA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" name="cvc" value={card.cvc} onChange={handleCardChange} placeholder="CVC" />
            </div>
          </div>
          <Button className="mt-4">Salvar Cartão</Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2025-03-01</TableCell>
                <TableCell>Pro</TableCell>
                <TableCell className="text-green-600">Paid</TableCell>
                <TableCell>R$ 59,90</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2025-02-01</TableCell>
                <TableCell>Pro</TableCell>
                <TableCell className="text-green-600">Paid</TableCell>
                <TableCell>R$ 59,90</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelar Inscrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">You can cancel your subscription at any time. Your access will remain until the end of the current billing period.</p>
          <Button variant="destructive">Cancelar Inscrição</Button>
        </CardContent>
      </Card>
    </div>
  )
}