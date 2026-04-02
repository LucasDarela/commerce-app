"use client";

import * as React from "react";
import {
  Search,
  PlayCircle,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  Beer,
  FileText,
  Settings,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type HelpVideo = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
};

type HelpSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  videos: HelpVideo[];
};

const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Primeiros passos",
    description: "Entenda a estrutura do sistema e como começar a usar o Chopp Hub.",
    icon: LifeBuoy,
    videos: [
      {
        id: "intro-system",
        title: "Visão geral do sistema",
        description:
          "Apresenta o painel principal, os menus e a lógica geral de funcionamento do sistema.",
        videoUrl: "https://www.youtube.com/embed/zT46fCKzn7o?si=LyerUZCcxlQ7yK3D",
      },
      {
        id: "how-dashboard-works",
        title: "Como navegar pelo dashboard",
        description:
          "Mostra como acessar os módulos principais, entender os indicadores e localizar funções importantes.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "customers",
    title: "Clientes",
    description: "Cadastro, edição, pesquisa e organização dos clientes da empresa.",
    icon: Users,
    videos: [
      {
        id: "customer-create",
        title: "Como cadastrar um cliente",
        description:
          "Explica o preenchimento dos dados do cliente, vínculo com a empresa e informações usadas nas vendas.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "customer-edit",
        title: "Como editar clientes e vincular tabela de preço",
        description:
          "Mostra como atualizar dados do cliente e como associar um catálogo de preços personalizado.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "products",
    title: "Produtos",
    description: "Gestão do catálogo, estoque e valores utilizados no sistema.",
    icon: Package,
    videos: [
      {
        id: "product-create",
        title: "Como cadastrar produtos",
        description:
          "Ensina como criar produtos, preencher preços e manter o catálogo organizado.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "product-stock",
        title: "Controle de estoque",
        description:
          "Explica como o estoque é atualizado nas entradas financeiras, vendas e devoluções.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "orders",
    title: "Vendas e pedidos",
    description: "Criação de pedidos, pagamento, entrega, coleta e espelho da venda.",
    icon: ShoppingCart,
    videos: [
      {
        id: "order-create",
        title: "Como criar uma venda",
        description:
          "Mostra como registrar uma nova venda, selecionar cliente, produtos e forma de pagamento.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "order-delivery",
        title: "Fluxo de entrega e coleta",
        description:
          "Explica o uso dos status Entregar, Coletar e Coletado, além da lógica operacional do pedido.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "order-payment",
        title: "Pagamento parcial e total de pedidos",
        description:
          "Mostra como lançar pagamentos, acompanhar valores em aberto e atualizar o status da venda.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "equipments",
    title: "Equipamentos e comodato",
    description: "Controle de chopeiras, barris, cilindros e itens emprestados para clientes.",
    icon: Beer,
    videos: [
      {
        id: "loan-create",
        title: "Como registrar empréstimo de equipamento",
        description:
          "Ensina como vincular equipamentos aos clientes e manter o controle de comodato.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "loan-return",
        title: "Como registrar retorno de itens",
        description:
          "Mostra como devolver equipamentos e acompanhar o saldo ainda em posse do cliente.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "financial",
    title: "Financeiro",
    description: "Contas a pagar, contas a receber, notas financeiras e lançamentos.",
    icon: Wallet,
    videos: [
      {
        id: "financial-create",
        title: "Como adicionar uma nota financeira",
        description:
          "Mostra como lançar notas de entrada e saída, selecionar categoria e informar valores.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "financial-filters",
        title: "Como usar filtros e categorias no financeiro",
        description:
          "Explica o uso de filtros, categorias fixas e personalizadas, além da organização mensal.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "financial-payments",
        title: "Como marcar notas como pagas",
        description:
          "Ensina a registrar pagamentos e interpretar corretamente o que já foi pago e o que ainda está pendente.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "deliveries",
    title: "Rotas e operação",
    description: "Uso operacional do sistema para entregas, motoristas e acompanhamento do pedido.",
    icon: Truck,
    videos: [
      {
        id: "driver-assignment",
        title: "Como vincular motorista a um pedido",
        description:
          "Mostra como distribuir pedidos entre motoristas e organizar a operação de entrega.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "operational-flow",
        title: "Fluxo operacional da entrega",
        description:
          "Explica o processo ideal desde o agendamento até a entrega, assinatura e coleta futura.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "invoices",
    title: "NF-e e documentos",
    description: "Emissão de nota fiscal, espelho da venda e fluxo documental.",
    icon: FileText,
    videos: [
      {
        id: "nfe-issue",
        title: "Como emitir NF-e",
        description:
          "Mostra como iniciar a emissão de NF-e a partir de um pedido e acompanhar o status.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "mirror-view",
        title: "Como visualizar o espelho da venda",
        description:
          "Explica o uso do espelho da venda para conferência dos dados e apoio operacional.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
  {
    id: "settings",
    title: "Configurações e cadastros base",
    description: "Configurações da empresa, contas bancárias e estrutura inicial do sistema.",
    icon: Settings,
    videos: [
      {
        id: "company-settings",
        title: "Como configurar a empresa",
        description:
          "Mostra como preencher os dados principais da empresa utilizados no sistema.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        id: "bank-accounts",
        title: "Como cadastrar contas bancárias",
        description:
          "Explica o cadastro de contas bancárias para uso nos lançamentos financeiros.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
    ],
  },
];

function HelpVideoCard({ video }: { video: HelpVideo }) {
  return (
    <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-[320px_1fr]">
      <div className="overflow-hidden rounded-lg border bg-muted">
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src={video.videoUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3">
        <div className="flex items-start gap-2">
          <PlayCircle className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold">{video.title}</h3>
            <p className="text-sm text-muted-foreground">{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = React.useState("");

  const filteredSections = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return helpSections;

    return helpSections
      .map((section) => {
        const sectionMatches =
          section.title.toLowerCase().includes(query) ||
          section.description.toLowerCase().includes(query);

        const filteredVideos = section.videos.filter(
          (video) =>
            video.title.toLowerCase().includes(query) ||
            video.description.toLowerCase().includes(query),
        );

        if (sectionMatches) {
          return section;
        }

        if (filteredVideos.length > 0) {
          return {
            ...section,
            videos: filteredVideos,
          };
        }

        return null;
      })
      .filter(Boolean) as HelpSection[];
  }, [search]);

  const totalVideos = filteredSections.reduce(
    (acc, section) => acc + section.videos.length,
    0,
  );

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Central de Ajuda</Badge>
                  <Badge variant="outline">{totalVideos} vídeos</Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Aprenda a usar o Chopp Hub
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Nesta área você pode assistir vídeos explicativos e entender
                    como usar cada funcionalidade do sistema no dia a dia da sua
                    operação.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por vendas, financeiro, equipamentos, clientes..."
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Aprenda a criar pedidos, receber pagamentos e acompanhar entregas.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Veja como lançar notas, organizar categorias e controlar contas.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comodato</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Controle empréstimos e retornos de equipamentos com mais clareza.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Entenda o fluxo de espelho da venda, NF-e e documentos da operação.
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Tutoriais por categoria</CardTitle>
          </CardHeader>

          <CardContent>
            {filteredSections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum conteúdo encontrado para a busca informada.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-3">
                {filteredSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="rounded-xl border px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div className="rounded-lg border p-2">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div>
                            <div className="font-semibold">{section.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {section.description}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pt-2">
                        <div className="grid gap-4">
                          {section.videos.map((video) => (
                            <HelpVideoCard key={video.id} video={video} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Mais conteúdos em breve</h2>
              <p className="text-sm text-muted-foreground">
                Serão adicionados novos vídeos por módulo conforme o sistema
                evoluir.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Base pronta para escalar sua central de ajuda
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}