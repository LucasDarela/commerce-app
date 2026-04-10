"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import lupulo1Image from "@/app/assets/lupulo7.webp";
import lupulo2Image from "@/app/assets/lupulo8.webp";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CallToAction() {
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef as React.RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [120, -120]);

  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    event.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: (targetElement as HTMLElement).offsetTop - 10,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden py-24"
    >
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold text-primary md:text-5xl leading-tight">
          Pare de perder dinheiro com pedidos desorganizados
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Centralize pedidos, estoque, entregas, boletos e financeiro em um único sistema
          e tenha mais controle da sua distribuidora no dia a dia. Teste o Chopp Hub por
          30 dias e veja na prática como sua operação pode ficar mais organizada, rápida
          e lucrativa.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground md:text-base">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Mais controle da operação sem depender de planilhas
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Menos erros em pedidos, entregas, estoque e cobranças
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            30 dias grátis para testar sem compromisso
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild className="h-12 px-8 text-base font-semibold shadow-md">
            <Link href="#plans" onClick={(e) => handleScroll(e, "#plans")}>
              Quero testar grátis agora
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sem cobrança durante o período de teste nos planos Essential e Pro.
        </p>

        <div className="relative mx-auto w-full max-w-[850px]">
          <motion.img
            src={lupulo1Image.src}
            alt="Lúpulo decorativo"
            height={300}
            width={300}
            className="pointer-events-none absolute -right-28 bottom-10 hidden opacity-70 will-change-transform md:block"
            style={{ y: translateY }}
          />
          <motion.img
            src={lupulo2Image.src}
            alt="Lúpulo decorativo"
            height={263}
            width={263}
            className="pointer-events-none absolute bottom-24 -left-28 hidden opacity-70 will-change-transform md:block"
            style={{ y: translateY }}
          />
        </div>
      </div>
    </section>
  );
}