import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import {
  IconPackage,
  IconCalendar,
  IconFileInvoice,
  IconBarcode,
  IconCurrencyDollar,
  IconBox,
  IconTruckDelivery,
  IconDeviceMobile,
  IconShieldLock,
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
        "Seu estoque é atualizado automaticamente a cada venda, devolução ou entrada de mercadoria, evitando erros, perdas e falta de produto.",
    },
    {
      title: "Entregas e coletas mais organizadas",
      icon: <IconCalendar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Saiba exatamente o que precisa ser entregue, coletado e o que já foi finalizado no dia, sem depender de anotações soltas ou memória.",
    },
    {
      title: "Emita NF-e quando quiser, sem travar sua operação",
      icon: <IconFileInvoice className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Você decide de qual pedido deseja emitir nota fiscal. Se não precisar emitir, o sistema continua funcionando normalmente, sem burocracia desnecessária.",
    },
    {
      title: "Boletos gerados com mais praticidade",
      icon: <IconBarcode className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Gere boletos de forma simples, com mais organização na cobrança e no acompanhamento dos recebimentos da sua distribuidora.",
    },
    {
      title: "Tenha clareza do dinheiro que entra e do que sai",
      icon: <IconCurrencyDollar className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Acompanhe contas a pagar, contas a receber, pagamentos pendentes e o financeiro da empresa com muito mais controle.",
    },
    {
      title: "Motorista pode dar baixa na entrega pelo celular",
      icon: <IconDeviceMobile className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Seu motorista acessa o sistema pelo celular e atualiza a entrega em tempo real, reduzindo ligações, mensagens e falta de informação no dia a dia.",
    },
    {
      title: "Acesso do motorista limitado ao que realmente importa",
      icon: <IconShieldLock className="mx-auto h-8 w-8 text-primary" />,
      description:
        "O motorista não tem acesso ao financeiro da empresa nem a áreas sensíveis do sistema. Cada perfil visualiza apenas o que precisa para trabalhar.",
    },
    {
      title: "Relatórios para enxergar melhor sua operação",
      icon: <IconTruckDelivery className="mx-auto h-8 w-8 text-primary" />,
      description:
        "Visualize relatórios de vendas, estoque, comodatos, equipamentos e produtos para identificar gargalos, melhorar a gestão e tomar decisões com mais segurança.",
    },
  ];

  return (
    <section id="features" className="max-w-6xl mx-auto py-20 text-center">
      <div className="section-heading section-header px-6">
        <h2 className="section-title text-primary">
          Tudo o que sua distribuidora de bebidas precisa para vender mais
        </h2>

        <p className="section-description mt-5 text-muted-foreground max-w-3xl mx-auto">
          Pare de depender de planilhas, controles soltos e processos manuais.
          O Chopp Hub centraliza pedidos, estoque, entregas, notas fiscais,
          boletos, financeiro e operação em uma única plataforma.
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