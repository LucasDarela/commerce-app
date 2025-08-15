"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, X } from "lucide-react";
import clsx from "clsx";

const planos = [
  {
    nome: "Basic",
    preco: "R$100/mês",
    descricao:
      "Ideal para pequenas operações começarem a organizar seu financeiro.",
    funcionalidades: [
      "Dashboard básico",
      "Gestão financeira (entradas e saídas)",
      "1 usuário logado",
    ],
    restricoes: ["Sem agendamentos", "Sem controle de delivery"],
    destaque: false,
  },
  {
    nome: "Enterprise",
    preco: "R$400/mês",
    descricao:
      "Para equipes que precisam de mais usuários e recursos sem limites.",
    funcionalidades: [
      "Todas as funções liberadas",
      "Agendamentos e controle de delivery",
      "Até 5 usuários simultâneos",
      "Suporte prioritário",
    ],
    restricoes: ["+5 usuários adicionar via suporte"],
    destaque: true,
  },
  {
    nome: "Starter",
    preco: "R$300/mês",
    descricao:
      "Perfeito para quem já precisa de agendamentos e controle de entregas.",
    funcionalidades: [
      "Todas as funções habilitadas",
      "Agendamentos de delivery",
      "Controle de delivery",
      "Até 2 usuários simultâneos",
      "Suporte",
    ],
    restricoes: ["Limite de 2 usuários simultâneos"],
    destaque: false,
  },
];

export default function Planos() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto p-6" id="plans">
      <div className="section-heading section-header mb-4">
        <h2 className="section-title text-primary">Escolha seu Plano</h2>
        <p className="section-description mt-5 text-muted-foreground">
          Temos o plano ideal para sua empresa. Teste grátis por 3 dias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {planos.map((plano, index) => (
          <div key={index} className="relative">
            {plano.destaque && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-xs uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow">
                  <Star size={14} /> Mais Popular
                </span>
              </div>
            )}

            <Card
              className={clsx(
                "p-6 shadow-md rounded-lg flex flex-col justify-between transition-transform hover:scale-[1.02]",
                plano.destaque && "border-2 border-primary shadow-lg",
              )}
            >
              <CardContent className="flex flex-col flex-1">
                <h2 className="text-2xl font-bold text-center">{plano.nome}</h2>
                <p className="text-center text-gray-500 mt-1">{plano.preco}</p>
                <p className="text-center text-xs text-muted-foreground mt-2 italic">
                  {plano.descricao}
                </p>

                <div className="mt-4">
                  <p className="font-semibold text-sm text-blue-600">
                    Funcionalidades:
                  </p>
                  <ul className="text-xs mt-1">
                    {plano.funcionalidades.map((func, i) => (
                      <li key={i} className="flex items-center">
                        <Check className="text-green-500 mr-2" size={16} />{" "}
                        {func}
                      </li>
                    ))}
                  </ul>
                </div>

                {plano.restricoes && (
                  <div className="mt-4">
                    <p className="font-semibold text-sm text-red-600">
                      Restrições:
                    </p>
                    <ul className="text-xs mt-1">
                      {plano.restricoes.map((rest, i) => (
                        <li key={i} className="flex items-center">
                          <X className="text-red-500 mr-2" size={16} /> {rest}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  onClick={() =>
                    router.push(`/cadastro?plano=${plano.nome.toLowerCase()}`)
                  }
                >
                  Escolher {plano.nome}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
