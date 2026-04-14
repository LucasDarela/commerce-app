"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Smartphone, BadgePercent } from "lucide-react";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "yearly";

const plans = {
  monthly: [
    {
      id: "essential-monthly",
      name: "Essential",
      price: "R$297",
      periodLabel: "/mês",
      badge: "",
      description:
        "Para distribuidoras que querem organizar a operação e sair das planilhas.",
      features: [
        "Gestão completa de pedidos",
        "Controle automático de estoque",
        "Organização de entregas e coletas",
        "Motorista pode acessar o sistema pelo celular",
        "Até 2 usuários inclusos",
        "Relatórios de vendas, estoque, comodatos, equipamentos e produtos",
      ],
      limitations: ["Sem emissão de boletos", "Sem emissão de NF-e"],
      cta: "Começar teste grátis",
      highlight: false,
      note: "Ideal para começar com mais organização sem complicar a operação.",
      hasTrial: true,
    },
    {
      id: "pro-monthly",
      name: "Pro",
      price: "R$397",
      periodLabel: "/mês",
      badge: "Mais usado",
      description:
        "O plano ideal para quem quer controle total da distribuidora em um único sistema.",
      features: [
        "Todas as funcionalidades do Essential",
        "Emissão de boletos para clientes",
        "Emissão de NF-e quando quiser",
        "Controle financeiro da empresa",
        "Saiba o que entregar, coletar e o que já foi coletado",
        "Motorista sem acesso ao financeiro",
        "Até 5 usuários inclusos",
        "Relatórios completos da operação",
      ],
      limitations: [],
      cta: "Testar plano Pro",
      highlight: true,
      note: "Hoje é o plano mais escolhido pelas distribuidoras que usam o Chopp Hub.",
      hasTrial: true,
    },
    {
      id: "enterprise-monthly",
      name: "Enterprise",
      price: "R$997",
      periodLabel: "/mês",
      badge: "",
      description:
        "Para operações que querem crescer com suporte mais próximo e acompanhamento estratégico.",
      features: [
        "Todas as funcionalidades do Pro",
        "Mentoria de implementação e acompanhamento do sucesso da distribuidora",
        "Reuniões semanais para alinhamento e ajustes na operação",
        "Apoio para organizar o financeiro da distribuidora",
        "Suporte prioritário",
        "Até 15 usuários inclusos",
        "Mais clareza para escalar a operação com segurança",
      ],
      limitations: [],
      cta: "Entrar no Enterprise",
      highlight: false,
      note: "Indicado para empresas que querem apoio na gestão e crescimento da operação.",
      hasTrial: false,
    },
  ],
  yearly: [
    {
      id: "essential-yearly",
      name: "Essential",
      price: "R$3.207",
      periodLabel: "/ano",
      badge: "10% OFF",
      description:
        "Para distribuidoras que querem organizar a operação e economizar no plano anual.",
      features: [
        "Gestão completa de pedidos",
        "Controle automático de estoque",
        "Organização de entregas e coletas",
        "Motorista pode acessar o sistema pelo celular",
        "Até 2 usuários inclusos",
        "Relatórios de vendas, estoque, comodatos, equipamentos e produtos",
      ],
      limitations: ["Sem emissão de boletos", "Sem emissão de NF-e"],
      cta: "Começar teste grátis",
      highlight: false,
      note: "Economia de 10% no anual.",
      hasTrial: true,
    },
    {
      id: "pro-yearly",
      name: "Pro",
      price: "R$4.287",
      periodLabel: "/ano",
      badge: "10% OFF",
      description:
        "Controle total da distribuidora com todas as funcionalidades liberadas e economia no anual.",
      features: [
        "Todas as funcionalidades do Essential",
        "Emissão de boletos para clientes",
        "Emissão de NF-e quando quiser",
        "Controle financeiro da empresa",
        "Saiba o que entregar, coletar e o que já foi coletado",
        "Motorista sem acesso ao financeiro",
        "Até 5 usuários inclusos",
        "Relatórios completos da operação",
      ],
      limitations: [],
      cta: "Testar plano Pro",
      highlight: true,
      note: "Plano mais utilizado, com 10% de desconto no pagamento anual.",
      hasTrial: true,
    },
    {
      id: "enterprise-yearly",
      name: "Enterprise",
      price: "R$10.767",
      periodLabel: "/ano",
      badge: "10% OFF",
      description:
        "Para distribuidoras que querem acompanhamento próximo e apoio para crescer com mais organização.",
      features: [
        "Todas as funcionalidades do Pro",
        "Mentoria de implementação e acompanhamento do sucesso da distribuidora",
        "Reuniões semanais para alinhamento e ajustes na operação",
        "Apoio para organizar o financeiro da distribuidora",
        "Suporte prioritário",
        "Até 15 usuários inclusos",
        "Mais clareza para escalar a operação com segurança",
      ],
      limitations: [],
      cta: "Entrar no Enterprise",
      highlight: false,
      note: "Economia de 10% no anual.",
      hasTrial: false,
    },
  ],
};

export default function Planos() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const currentPlans = useMemo(() => plans[billingPeriod], [billingPeriod]);

  const handleCTA = (planName: string) => {
    router.push("/login-signin");
  };

  return (
    <section id="plans" className="scroll-mt-32 px-6 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="section-title mt-5 text-primary">
            Escolha o plano ideal para organizar sua distribuidora
          </h2>

          <p className="text-muted-foreground mt-4 max-w-3xl mx-auto leading-7">
            Pare de perder dinheiro com pedidos desorganizados, falhas no estoque,
            cobranças mal controladas e falta de visibilidade da operação. O{" "}
            <strong>Chopp Hub</strong> centraliza tudo em um único sistema.
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Teste grátis por <span className="font-semibold">30 dias</span> nos planos Essential e Pro.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition",
                billingPeriod === "monthly"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Mensal
            </button>

            <button
              type="button"
              onClick={() => setBillingPeriod("yearly")}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition",
                billingPeriod === "yearly"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {currentPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative rounded-2xl border-border/60 shadow-sm transition-all duration-300",
                plan.highlight
                  ? "border-2 border-primary shadow-xl lg:-translate-y-2"
                  : "hover:shadow-lg"
              )}
            >
              {plan.badge ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span
                    className={cn(
                      "text-xs uppercase px-4 py-1 rounded-full flex items-center gap-2 shadow",
                      plan.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background"
                    )}
                  >
                    {plan.highlight ? <Star size={14} /> : <BadgePercent size={14} />}
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <CardContent className="p-8 flex flex-col h-full">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>

                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.periodLabel}</span>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-6">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-8">
                  <p className="font-semibold text-sm text-primary mb-4">
                    O que está incluído:
                  </p>

                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="text-green-500 mt-0.5 shrink-0" size={18} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div className="mt-6 rounded-xl border bg-muted/40 p-4">
                    <p className="text-sm font-medium mb-2">Não inclui neste plano:</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {plan.limitations.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {plan.note}
                </div>

                <Button
                  className={cn(
                    "w-full mt-8 h-12 text-base font-semibold",
                    plan.highlight && "shadow-md"
                  )}
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleCTA(plan.name)}
                >
                  {plan.cta}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  {plan.hasTrial
                    ? "Você não paga nada pelos primeiros 30 dias."
                    : "Neste plano, a contratação já inicia com cobrança imediata."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 max-w-3xl mx-auto">
          <Card className="rounded-2xl border-border/60 bg-muted/30">
            <CardContent className="p-6 md:p-7">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Smartphone size={18} />
                    Add-on opcional: App Mobile Offline para Motoristas
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground leading-6">
                    Adicione o app mobile ao seu plano para que o motorista possa
                    atualizar entregas em campo com mais praticidade. Ideal para quem
                    quer mais controle operacional sem precisar trocar de plano.
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    Disponível como upgrade adicional no plano Pro e Enterprise.
                  </p>
                </div>

                <div className="shrink-0">
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => router.push("/login-signin")}
                  >
                    Quero saber sobre o app
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto leading-6">
            O plano <strong>Pro</strong> é o mais recomendado para distribuidoras que
            querem controlar pedidos, estoque, entregas, cobranças e financeiro em um
            só lugar, sem depender de planilhas ou processos manuais.
          </p>
        </div>
      </div>
    </section>
  );
}