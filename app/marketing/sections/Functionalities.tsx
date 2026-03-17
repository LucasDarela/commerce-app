import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import {
  IconPackage,
  IconCalendar,
  IconFileInvoice,
  IconBarcode,
  IconCurrencyDollar,
  IconBox,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Functionalities() {
  const features = [
    {
      title: "Organize seus pedidos do início ao fim",
      icon: <IconPackage className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Cadastre, acompanhe e atualize cada venda com rapidez. Tenha controle do status, pagamento e emissão de nota em um só lugar.",
    },
    {
      title: "Saiba exatamente o que entrou, saiu e ainda está disponível",
      icon: <IconBox className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Seu estoque é atualizado automaticamente a cada venda, devolução ou entrada de mercadoria, evitando erros e falta de produto.",
    },
    {
      title: "Entregas mais organizadas, operação mais eficiente",
      icon: <IconCalendar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Defina data, hora e local de entrega ou coleta e mantenha sua logística diária sob controle.",
    },
    {
      title: "Emita NF-e sem complicação",
      icon: <IconFileInvoice className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Gere notas fiscais direto no sistema, com muito mais agilidade e menos risco de erro no processo.",
    },
    {
      title: "Cobrança mais simples e profissional",
      icon: <IconBarcode className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Gere boletos com vencimento automático, envie ao cliente e tenha mais controle sobre o recebimento.",
    },
    {
      title: "Tenha clareza do dinheiro que entra e do que sai",
      icon: <IconCurrencyDollar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Acompanhe contas a pagar, contas a receber, fluxo de caixa e pagamentos em um painel muito mais organizado.",
    },
  ];

  return (
    <section id="features" className="max-w-6xl mx-auto py-20 text-center">
      <div className="section-heading section-header px-6">
        <h2 className="section-title text-primary">
          Tudo o que sua distribuidora precisa para vender mais e errar menos
        </h2>

        <p className="section-description mt-5 text-muted-foreground max-w-3xl mx-auto">
          Pare de depender de planilhas, controles soltos e processos manuais.
          O Chopp Hub centraliza pedidos, estoque, entregas, notas fiscais,
          boletos e financeiro em uma única plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-10 px-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="h-full border-border/60 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
          >
            <CardContent className="p-6 text-center">
              {feature.icon}
              <h3 className="text-xl font-semibold mt-4">{feature.title}</h3>
              <p className="mt-3 text-muted-foreground text-sm leading-6">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 px-6">
        <p className="text-base text-muted-foreground">
          Comece agora e veja como sua operação pode ficar mais organizada,
          rápida e lucrativa.
        </p>

        <Button asChild className="mt-6 h-11 px-8">
          <Link href="#plans">Começar teste grátis</Link>
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          Teste grátis por 30 dias.
        </p>
      </div>
    </section>
  );
}