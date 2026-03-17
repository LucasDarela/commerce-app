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
        <h2 className="text-3xl md:text-4xl font-bold text-primary">
          Teste o Chopp Hub por 30 dias grátis
        </h2>

        <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-7">
          Organize pedidos, estoque, entregas, boletos e financeiro em um único
          sistema. Veja na prática como sua distribuidora pode operar com mais
          controle, agilidade e menos erros.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Gestão completa da operação
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Mais organização no dia a dia
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            30 dias grátis para testar sem compromisso
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild className="h-12 px-8 text-base font-semibold">
            <Link href="#plans" onClick={(e) => handleScroll(e, "#plans")}>
              Começar teste grátis
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sem cobrança durante o período de teste.
        </p>

        <div className="relative w-full max-w-[850px] mx-auto">
          <motion.img
            src={lupulo1Image.src}
            alt="Lúpulo decorativo"
            height={300}
            width={300}
            className="hidden md:block absolute -right-28 bottom-10 opacity-70 will-change-transform pointer-events-none"
            style={{ y: translateY }}
          />
          <motion.img
            src={lupulo2Image.src}
            alt="Lúpulo decorativo"
            height={263}
            width={263}
            className="hidden md:block absolute bottom-24 -left-28 opacity-70 will-change-transform pointer-events-none"
            style={{ y: translateY }}
          />
        </div>
      </div>
    </section>
  );
}