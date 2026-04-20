"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/assets/logo-blue.png";

export default function Footer() {
  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: (targetElement as HTMLElement).offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  return (
    <footer
      id="footer"
      className="bg-black text-[#BCBCBC] text-sm py-10 text-center z-10"
    >
      <div className="container mx-auto">
        <div className="inline-flex relative">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logo}
              alt="Logo Chopp Hub"
              className="h-9 w-9 object-contain"
            />
            <span className="text-xl font-bold text-white">Chopp Hub</span>
          </Link>
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
            href="#testimonials"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#testimonials")}
          >
            Clientes
          </a>
          <a
            href="#plans"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#plans")}
          >
            Preços
          </a>
          <a
            href="#faq"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#faq")}
          >
            FAQ
          </a>

          <a
            href="#contact"
            className="hover:text-primary"
            onClick={(e) => handleScroll(e, "#contact")}
          >
            Contato
          </a>
        </nav>
        <div className="flex gap-4 justify-center mt-8">
          <h3>48 9 9144-7684</h3>
          <h4>suporte@chopphub.com</h4>
        </div>

        <div className="flex flex-col items-center gap-6 mt-6">
          <p className="mt-6">
            © {new Date().getFullYear()}{" "}
            <span className="font-bold">Chopp Hub</span>. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
