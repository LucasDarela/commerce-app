import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const planos = [
  {
    nome: "Basic",
    preco: "R$100/mês",
    descricao: "Sistema financeiro básico com 1 usuário e funcionalidades limitadas.",
    periodoTeste: "Todas as funções por 3 dias grátis",
    funcionalidades: [
      "Dashboard básico",
      "Cadastro de clientes e fornecedores",
      "Gestão financeira (entradas e saídas)",
    ],
    restricoes: [
      "Sem agendamentos",
      "Sem controle de delivery",
      "Apenas 1 usuário cadastrado",
    ],
  },
  {
    nome: "Starter",
    preco: "R$500/mês",
    descricao: "Todas as funcionalidades habilitadas com limite de 2 usuários simultâneos.",
    periodoTeste: "3 dias grátis",
    funcionalidades: [
      "Todas as funções habilitadas",
      "Agendamentos e controle de delivery",
      "Até 2 usuários logados ao mesmo tempo",
    ],
  },
  {
    nome: "Enterprise",
    preco: "R$800/mês",
    descricao: "Todas as funcionalidades e até 5 usuários simultâneos.",
    periodoTeste: "Sem teste grátis",
    funcionalidades: [
      "Todas as funções habilitadas",
      "Agendamentos e controle de delivery",
      "Até 5 usuários logados simultaneamente",
    ],
    suporte: "Usuários adicionais mediante contato com suporte."
  },
];

export default function Planos() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Escolha seu Plano</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos.map((plano, index) => (
          <Card key={index} className="p-6 shadow-md rounded-lg">
            <CardContent>
              <h2 className="text-2xl font-semibold text-center">{plano.nome}</h2>
              <p className="text-center text-gray-500 mt-2">{plano.preco}</p>
              <p className="text-center text-sm text-gray-400 mb-4">{plano.periodoTeste}</p>
              <ul className="text-sm space-y-2 mb-4">
                {plano.funcionalidades.map((func, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="text-green-500 mr-2" size={16} /> {func}
                  </li>
                ))}
              </ul>
              {plano.restricoes && (
                <div className="text-sm text-gray-500">
                  <p className="font-bold">Restrições:</p>
                  <ul className="space-y-2">
                    {plano.restricoes.map((rest, i) => (
                      <li key={i} className="flex items-center">
                        <X className="text-red-500 mr-2" size={16} /> {rest}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plano.suporte && (
                <p className="text-sm text-gray-500 mt-4">{plano.suporte}</p>
              )}
              <Button
                className="w-full mt-6"
                onClick={() => router.push(`/cadastro?plano=${plano.nome.toLowerCase()}`)}
              >
                Escolher Plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
