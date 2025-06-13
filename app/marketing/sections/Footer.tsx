"use client";

import React from "react";
import logoWh from "@/app/assets/logo-wh.webp";
import Image from "next/image";

export default function Footer() {
  // Função para fazer a rolagem suave até a seção correspondente
  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: (targetElement as HTMLElement).offsetTop - 80, // Ajuste de deslocamento
        behavior: "smooth",
      });
    }
  };

  return (
    <footer className="bg-black text-[#BCBCBC] text-sm py-10 text-center z-10">
      <div className="container mx-auto">
        <div className="inline-flex relative">
          <Image
            src={logoWh}
            alt="Darela Chopp Logomarca"
            height={40}
            className="relative"
          />
        </div>

        {/* Links de navegação com rolagem suave */}
        <nav className="flex flex-col md:flex-row md:justify-center gap-6 mt-6">
          <a
            href="#funcionalidades"
            className="hover:text-blue-700"
            onClick={(e) => handleScroll(e, "#funcionalidades")}
          >
            Funcionalidades
          </a>
          <a
            href="#precos"
            className="hover:text-blue-700"
            onClick={(e) => handleScroll(e, "#precos")}
          >
            Preços
          </a>
          <a
            href="#testemunhos"
            className="hover:text-blue-700"
            onClick={(e) => handleScroll(e, "#testemunhos")}
          >
            Clientes
          </a>
          <a
            href="#contato"
            className="hover:text-blue-700"
            onClick={(e) => handleScroll(e, "#contato")}
          >
            Contato
          </a>
        </nav>

        <div className="flex flex-col items-center gap-6 mt-6">
          <p className="mt-6">
            © 2025 Neotech X. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
