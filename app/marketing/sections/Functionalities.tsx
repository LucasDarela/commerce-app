import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import {
  IconTruck,
  IconPackage,
  IconCalendar,
  IconFileInvoice,
  IconBarcode,
  IconCurrencyDollar,
  IconBox,
} from "@tabler/icons-react";

export default function Functionalities() {
  const features = [
    {
      title: "Gestão de Pedidos",
      icon: <IconPackage className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Cadastre e acompanhe todas as suas vendas, desde o pedido até a entrega. Controle status de pagamento, método de pagamento e emissão de notas fiscais.",
    },
    {
      title: "Controle de Estoque",
      icon: <IconBox className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Estoque atualizado automaticamente a cada venda, devolução ou entrada de nota. Visualize o saldo disponível de cada produto em tempo real.",
    },
    {
      title: "Agendamento de Entregas",
      icon: <IconCalendar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Defina data, hora e local de entrega ou coleta. Organize suas rotas diárias com visualização por período, status e cliente.",
    },
    {
      title: "Emissão de Notas Fiscais",
      icon: <IconFileInvoice className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Emita NF-e direto pelo sistema com integração à API da Focus NFe. Personalize o CFOP, impostos (PIS, COFINS), e gere XML e DANFE com apenas um clique.",
    },
    {
      title: "Geração de Boletos",
      icon: <IconBarcode className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Gere boletos registrados com vencimento calculado automaticamente. Envie por e-mail com PDF anexo, adicione assinatura digital do cliente e integre com Mercado Pago ou Asaas.",
    },
    {
      title: "Gestão Financeira",
      icon: <IconCurrencyDollar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Controle contas a pagar e a receber, acompanhe pagamentos parciais, visualize fluxo de caixa e acompanhe o saldo financeiro do mês. Inclui controle de fornecedores e compras de estoque.",
    },
  ];

  return (
    <section id="features" className="max-w-5xl mx-auto py-20 text-center">
      <div className="section-heading section-header">
        <h2 className="section-title">Principais Funcionalidades</h2>
        <p className="section-description mt-5">
          Tudo o que você precisa para gerenciar sua distribuidora de forma
          simples, rápida e eficiente.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 px-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent className="p-6 text-center">
              {feature.icon}
              <h3 className="text-xl font-semibold mt-4">{feature.title}</h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
