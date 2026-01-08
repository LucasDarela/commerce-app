"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import lupulo1Image from "@/app/assets/lupulo7.webp";
import lupulo2Image from "@/app/assets/lupulo8.webp";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CallToAction() {
  const scrollToRegion = () => {
    const regionSection = document.getElementById("regiao");
    if (regionSection) {
      const headerOffset = 80;
      const elementPosition =
        regionSection.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef as React.RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: (targetElement as HTMLElement).offsetTop - 5,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-gradient-to-b py-24"
    >
      <div>
        <h2 className="section-title mb-4 text-center text-primary">
          Teste Grátis
        </h2>
        <p className="section-description text-center mt-5 text-muted-foreground">
          Realize seu teste <span className="font-bold">10 dias</span> antes de
          começar a pagar
        </p>
        <div className="flex gap-2 mt-10 justify-center">
          <Button
            asChild
            className="sm:hidden md:flex btn btn-text gap-1 inline-flex whitespace-nowrap hover:text-gray hover:scale-105 transition"
          >
            <Link href="#plans" onClick={(e) => handleScroll(e, "#plans")}>
              Teste Agora
            </Link>
          </Button>
        </div>

        {/* Imagens com efeito Parallax */}
        <div className="relative w-full max-w-[850px] mx-auto">
          <motion.img
            src={lupulo1Image.src}
            alt="Lúpulo imagem 1"
            height={300}
            width={300}
            className="hidden md:block absolute -right-28 bottom-16 opacity-70 will-change-transform"
            style={{ y: translateY }}
          />
          <motion.img
            src={lupulo2Image.src}
            alt="Lúpulo imagem 2"
            height={263}
            width={263}
            className="hidden md:block absolute bottom-32 -left-28 opacity-70 will-change-transform"
            style={{ y: translateY }}
          />
        </div>
      </div>
    </section>
  );
}
