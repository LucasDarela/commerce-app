"use client";

import React from "react";
import Image from "next/image";

export default function Footer() {
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
    <footer className="bg-black text-[#BCBCBC] text-sm py-10 text-center z-10">
      <div className="container mx-auto">
        <div className="inline-flex relative">
          <h2 className="relative text-xl font-bold">Chopp Hub</h2>
        </div>
        <nav className="flex flex-col md:flex-row md:justify-center gap-6 mt-6">
          <a
            href="#features"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#features")}
          >
            Funcionalidades
          </a>
          <a
            href="#plans"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#plans")}
          >
            Preços
          </a>
          <a
            href="#testimonials"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#testimonials")}
          >
            Clientes
          </a>
          <a
            href="#contact"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#contact")}
          >
            Contato
          </a>
          <a
            href="#faq"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#faq")}
          >
            Ajuda
          </a>
        </nav>

        <div className="flex flex-col items-center gap-6 mt-6">
          <p className="mt-6">
            © 2025 Chopp Hub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
