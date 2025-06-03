"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React from "react";
import logoWh from '@/app/assets/logo-wh.webp';
import Image from "next/image";
import Planos from "@/app/marketing/sections/Planos";
import Footer from "@/app/marketing/sections/Footer";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ThemeSelector } from "@/components/theme-selector";

export default function LandingLayout(){
   
    const handleScroll = (
        event: React.MouseEvent<HTMLAnchorElement>,
        targetId: string
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

      const [menuOpen, setMenuOpen] = useState(false);
      const toggleMenu = () => setMenuOpen(!menuOpen);
    
      const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        arrows: false,
      };

    return (
<div>
  {/* Navbar Responsiva */}
  <nav className="shadow-md p-4 flex items-center justify-between relative z-50">
    
    {/* Logo */}
    <div className="flex items-center gap-2">
      <h1 className="md:text-1xl lg:text-2xl font-bold">Chopp Hub</h1>
    </div>

    {/* Links Centralizados (somente em desktop) */}
    <ul className="hidden md:flex flex-1 justify-center md:gap-2 lg:gap-8 xl:gap-10 text-sm font-medium">
      <li><Link href="#features">Funcionalidades</Link></li>
      <li><Link href="#pricing">Preços</Link></li>
      <li><Link href="#testimonials">Clientes</Link></li>
      <li><Link href="#contact">Contato</Link></li>
    </ul>

    {/* Botões Sempre na Direita */}
    <div className="flex items-center gap-4">
      <ThemeSelector />
      <ModeToggle />

      {/* Log In Button só em desktop */}
      <div className="hidden md:block">
        <Button asChild>
          <Link href="/login-signin">Log In</Link>
        </Button>
      </div>

      {/* Menu Mobile Button só em mobile */}
      <div className="block md:hidden">
        <Button variant="ghost" size="icon" onClick={toggleMenu}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>
    </div>
  </nav>

  {/* Dropdown do Mobile Menu */}
  {menuOpen && (
    <ul className="bg-muted shadow-md fixed top-16 left-0 w-full flex flex-col items-center p-4 space-y-4 z-[9999]">
      <li><Link href="#features" onClick={toggleMenu}>Funcionalidades</Link></li>
      <li><Link href="#pricing" onClick={toggleMenu}>Preços</Link></li>
      <li><Link href="#testimonials" onClick={toggleMenu}>Clientes</Link></li>
      <li><Link href="#contact" onClick={toggleMenu}>Contato</Link></li>
      <li>
        <Button asChild>
          <Link href="/login-signin" onClick={toggleMenu}>Log In</Link>
        </Button>
      </li>
    </ul>
  )}  
      {/* Hero com Carrossel */}
      <section className="text-center py-20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <Slider {...sliderSettings} className="max-w-4xl mx-auto">
          <div className="p-10">
            <h2 className="text-4xl font-bold">Sitema Responsivo para sua Distribuidora</h2>
            <p className="mt-4 text-lg">Gerencia suas vendas através do Celular ou Computador.</p>
            <Button asChild className="mt-6">
              <Link href="/auth/signup">Experimente Agora</Link>
            </Button>
          </div>
          <div className="p-10">
            <h2 className="text-4xl font-bold">Controle Total do Seu Negócio</h2>
            <p className="mt-4 text-lg">Monitore vendas, estoque e clientes em tempo real.</p>
          </div>
          <div className="p-10">
            <h2 className="text-4xl font-bold">Facilidade e Agilidade nas Entregas</h2>
            <p className="mt-4 text-lg">Otimize seu tempo com um sistema de entregas eficiente.</p>
          </div>
        </Slider>
      </section>

      {/* Funcionalidades */}
      <section id="features" className="py-20 text-center">
        <h2 className="text-3xl font-bold">Principais Funcionalidades</h2>
        <p className="mt-2 text-gray-600">Tudo o que você precisa para gerenciar sua distribuidora.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 px-6">
          {["Gestão de Pedidos", "Controle de Estoque", "Agendamento de Entregas"].map((title, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-gray-600">Descrição breve sobre a funcionalidade.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Planos />

      {/* Testemunhos */}
      <section id="testimonials" className="py-20 text-center">
        <h2 className="text-3xl font-bold">O que Nossos Clientes Dizem</h2>
        <p className="mt-2 text-gray-600">Depoimentos de clientes satisfeitos.</p>
      </section>

      {/* Contato */}
      <section id="contact" className="py-20 text-center bg-gray-200">
        <h2 className="text-3xl font-bold">Entre em Contato</h2>
        <p className="mt-2 text-gray-600">Dúvidas? Fale com nossa equipe.</p>
      </section>

      {/* Footer */}
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
            © 2025 Chopp Hub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
    </div>
    )
}

