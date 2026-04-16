"use client";

import Link from "next/link";
import {
  Download,
  Smartphone,
  Apple,
  ShieldCheck,
  WifiOff,
  Truck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";

export default function DownloadAppPage() {
  const { mobileOfflineEnabled, loading } = useAuthenticatedCompany();
  const androidDownloadUrl = "./downloads/ChoppHubDriver.apk";

  const features = [
    {
      icon: <Truck className="h-5 w-5 text-primary" />,
      title: "Feito para entregadores",
      description:
        "Visualize pedidos, atualize entregas e acompanhe a rota de trabalho com mais praticidade.",
    },
    {
      icon: <WifiOff className="h-5 w-5 text-primary" />,
      title: "Pensado para operação em campo",
      description:
        "Ideal para uso na rua, com foco em agilidade e menos dependência de processos manuais.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-primary" />,
      title: "Mais controle para a empresa",
      description:
        "O motorista acessa apenas o que precisa, sem exposição ao financeiro ou áreas sensíveis.",
    },
  ];

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Verificando permissões...
      </div>
    );

  // Tela de bloqueio caso não tenha o add-on
  if (!mobileOfflineEnabled) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Recurso Premium
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              O aplicativo mobile offline para motoristas é um add-on opcional
              do Chopp Hub. Ative-o para dar mais agilidade à sua equipe de
              campo.
            </p>
          </div>
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6 text-sm text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Sincronização offline de entregas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Roteirização integrada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Relatórios de campo em tempo real</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild size="lg" className="w-full font-bold">
              <Link href="/dashboard/billing">Contratar Add-on</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Smartphone className="h-4 w-4 text-primary" />
              App oficial para motoristas do Chopp Hub
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Baixe o app Android do{" "}
              <span className="text-primary">Chopp Hub Driver</span>
            </h1>

            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              Dê mais agilidade para suas entregas e coletas. Com o app, o
              motorista pode acessar os pedidos, atualizar status e trabalhar
              com muito mais praticidade no dia a dia.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 text-base font-semibold"
              >
                <a href={androidDownloadUrl} download>
                  <Download className="mr-2 h-5 w-5" />
                  Baixar app Android
                </a>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base font-semibold"
                disabled
              >
                <Apple className="mr-2 h-5 w-5" />
                iOS em breve
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Disponível para Android. Caso o download não inicie
              automaticamente, entre em contato com o suporte da sua empresa.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/10 blur-3xl" />

            <Card className="overflow-hidden rounded-3xl border-border/60 shadow-xl">
              <CardContent className="p-0">
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Aplicativo mobile</p>
                      <h2 className="text-xl font-semibold">
                        Chopp Hub Driver
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  {features.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-border/60 bg-background p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          {feature.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {feature.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Em breve no iPhone
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      A versão para iOS está em desenvolvimento e será
                      disponibilizada em breve.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t bg-background/80">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Precisa de ajuda para instalar?
              </h2>
              <p className="text-sm text-muted-foreground">
                Se o seu celular bloquear a instalação, fale com o suporte para
                receber orientação.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/contato">Falar com suporte</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
