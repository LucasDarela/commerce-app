"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/app/marketing/sections/Contact";

type ContactSectionProps = {
  whatsappNumber?: string;
  whatsappMessage?: string;
};

export default function ContactSection({
  whatsappNumber = "5548999999999",
  whatsappMessage = "Olá! Quero conhecer melhor o Chopp Hub.",
}: ContactSectionProps) {
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <section id="contact" className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-primary">
          Fale com um especialista
        </h2>

        <p className="mt-4 text-muted-foreground leading-7">
          Quer entender como o Chopp Hub pode ajudar sua distribuidora a
          organizar pedidos, estoque, entregas e financeiro? Fale com a nossa
          equipe e tire suas dúvidas.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar no WhatsApp
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Resposta rápida para dúvidas, demonstração e suporte comercial.
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">
            Tire suas dúvidas sem compromisso
          </h3>

          <p className="mt-3 text-sm text-muted-foreground leading-6">
            Nossa equipe pode te mostrar como o sistema funciona e como ele pode
            ajudar no dia a dia da sua distribuidora.
          </p>

          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-xl border p-4">
              <p className="font-medium">Atendimento rápido</p>
              <p className="mt-1 text-muted-foreground">
                Fale com a equipe e receba orientação sobre o sistema.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">Demonstração do sistema</p>
              <p className="mt-1 text-muted-foreground">
                Entenda como pedidos, estoque, entregas e financeiro funcionam
                na prática.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">Mais segurança para decidir</p>
              <p className="mt-1 text-muted-foreground">
                Veja se o Chopp Hub faz sentido para sua operação antes de
                avançar.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}