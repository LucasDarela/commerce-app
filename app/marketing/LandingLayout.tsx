"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React from "react";
import Image from "next/image";
import Plans from "@/app/marketing/sections/Plans";
import Footer from "@/app/marketing/sections/Footer";
import NavBar from "./sections/NavBar";
import Testimonials from "./sections/Testimonials";
import CallToAction from "./sections/CallToAction";
import FAQ from "./sections/FAQ";
import Functionalities from "./sections/Functionalities";

export default function LandingLayout() {
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
      <NavBar />
      {/* Hero com Carrossel */}
      <section className="text-center py-20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <Slider {...sliderSettings} className="max-w-4xl mx-auto">
          <div className="p-10">
            <h2 className="text-4xl font-bold">
              Sitema Responsivo para sua Distribuidora
            </h2>
            <p className="mt-4 text-lg">
              Gerencia suas vendas através do Celular ou Computador.
            </p>
            <Button asChild className="mt-6">
              <Link href="/auth/signup">Experimente Agora</Link>
            </Button>
          </div>
          <div className="p-10">
            <h2 className="text-4xl font-bold">
              Controle Total do Seu Negócio
            </h2>
            <p className="mt-4 text-lg">
              Monitore vendas, estoque e clientes em tempo real.
            </p>
          </div>
          <div className="p-10">
            <h2 className="text-4xl font-bold">
              Facilidade e Agilidade nas Entregas
            </h2>
            <p className="mt-4 text-lg">
              Otimize seu tempo com um sistema de entregas eficiente.
            </p>
          </div>
        </Slider>
      </section>
      <Functionalities />
      <Plans />
      <Testimonials />
      <FAQ />
      <CallToAction />
      <Footer />
    </div>
  );
}
