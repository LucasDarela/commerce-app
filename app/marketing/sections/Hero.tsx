"use client";

import Link from "next/link";
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import heroImage1 from "@/app/assets/hero1.png";
import heroImage2 from "@/app/assets/hero2.png";
import heroImage3 from "@/app/assets/hero3.png";

export default function Hero() {
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
    <section
      className="text-center py-20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
      suppressHydrationWarning
    >
      <Slider {...sliderSettings} className="max-w-4xl mx-auto">
        <div className="p-10">
          <Image
            src={heroImage1}
            alt="Imagem 1"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
          />
          <h2 className="text-4xl font-bold">
            Sitema Responsivo para sua Distribuidora
          </h2>
          <p className="mt-4 text-lg">
            Gerencia suas vendas através do Celular ou Computador.
          </p>
          <Button
            asChild
            className="mt-6 transition transform duration-200 hover:scale-105"
          >
            <Link href="#plans">Experimente Agora</Link>
          </Button>
        </div>
        <div className="p-10">
          <Image
            src={heroImage2}
            alt="Imagem 2"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
          />
          <h2 className="text-4xl font-bold">Controle Total do Seu Negócio</h2>
          <p className="mt-4 text-lg">
            Monitore vendas, estoque e clientes em tempo real.
          </p>
          <Button
            asChild
            className="mt-6 transition transform duration-200 hover:scale-105"
          >
            <Link href="#plans">Teste Grátis</Link>
          </Button>
        </div>
        <div className="p-10">
          <Image
            src={heroImage3}
            alt="Imagem 3"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
          />
          <h2 className="text-4xl font-bold">
            Facilidade e Agilidade nas Entregas
          </h2>
          <p className="mt-4 text-lg">
            Otimize seu tempo com um sistema de entregas eficiente.
          </p>
          <Button
            asChild
            className="mt-6 transition transform duration-200 hover:scale-105"
          >
            <Link href="#plans">Confira os Planos</Link>
          </Button>
        </div>
      </Slider>
    </section>
  );
}
