"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const plano = {
  nome: "Plano Pro",
  preco: "R$300/mês",
  destaque: "Tudo que sua distribuidora precisa em um único sistema.",
  descricao:
    "Organize pedidos, estoque, entregas e financeiro da sua distribuidora em um único lugar. Economize tempo, evite erros e tenha controle total da sua operação.",
  funcionalidades: [
    "Gestão completa de pedidos",
    "Controle inteligente de estoque",
    "Agendamento e gestão de entregas",
    "Emissão automática de notas fiscais",
    "Geração de boletos para clientes",
    "Gestão financeira integrada",
    "Até 5 usuários inclusos",
  ],
  observacao: "Precisa de mais usuários? Fale com nosso suporte.",
};

export default function Planos() {
  const router = useRouter();

  return (
<section id="plans" className="scroll-mt-32 px-6 py-6 pt-16">
  <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="section-title mt-5 text-primary">
          Simplifique a gestão da sua distribuidora
        </h2>

        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Pare de controlar pedidos, estoque e financeiro em planilhas ou
          sistemas separados. O <strong>Chopp Hub</strong> reúne tudo em uma
          única plataforma.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Teste grátis por <span className="font-semibold">30 dias</span>.
          Sem compromisso.
        </p>
      </div>

      <div className="relative max-w-xl mx-auto">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-primary text-primary-foreground text-xs uppercase px-4 py-1 rounded-full flex items-center gap-2 shadow">
            <Star size={14} /> Plano recomendado
          </span>
        </div>

        <Card className="p-8 shadow-xl rounded-xl border-2 border-primary">
          <CardContent className="flex flex-col">
            <h2 className="text-3xl font-bold text-center">{plano.nome}</h2>

            <p className="text-center text-3xl font-semibold mt-2">
              {plano.preco}
            </p>

            <p className="text-center text-sm text-muted-foreground mt-2">
              {plano.destaque}
            </p>

            <p className="text-center text-sm text-muted-foreground mt-4 max-w-md mx-auto">
              {plano.descricao}
            </p>

            <div className="mt-8">
              <p className="font-semibold text-sm text-primary mb-4">
                O que está incluído:
              </p>

              <ul className="space-y-3 text-sm">
                {plano.funcionalidades.map((func, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="text-green-500 mr-3" size={18} />
                    {func}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
              {plano.observacao}
            </div>

            <Button
              className="w-full mt-8 h-12 text-base font-semibold"
              onClick={() => router.push("/login-signin")}
            >
              Começar teste grátis
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-3">
              Você não paga nada pelos primeiros 30 dias.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </section>
  );
}