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
            alt="Sitema Responsivo para sua Distribuidora"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
            priority
          />
          <h2 className="section-title font-bold">
          Pare de perder dinheiro com pedidos desorganizados
          </h2>

          <p className="mt-4 section-description">
          Controle pedidos, estoque, entregas e financeiro da sua distribuidora em um
          único sistema.
          </p>

          <Button asChild className="mt-6 hover:scale-105 text-primary" variant="secondary">
            <Link href="#plans">Começar teste grátis</Link>
          </Button>
        </div>
        <div className="p-10">
          <Image
            src={heroImage2}
            alt="Controle Total do Seu Negócio"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
          />
        <h2 className="section-title font-bold">
        Tenha controle total da sua distribuidora
        </h2>

        <p className="mt-4 section-description">
        Acompanhe vendas, estoque e clientes em tempo real e tome decisões com dados
        reais do seu negócio.
        </p>

        <Button asChild className="mt-6 hover:scale-105 text-primary" variant="secondary">
          <Link href="#plans">Testar por 30 dias grátis</Link>
        </Button>
        </div>
        <div className="p-10">
          <Image
            src={heroImage3}
            alt="Facilidade e Agilidade nas Entregas"
            className="mx-auto mb-6 rounded-lg"
            width={200}
            height={100}
          />
          <h2 className="section-title font-bold">
          Organize suas entregas e nunca mais perca pedidos
          </h2>

          <p className="mt-4 section-description">
          Agende entregas, gerencie pedidos e mantenha sua operação funcionando sem
          confusão.
          </p>

          <Button asChild className="mt-6 hover:scale-105 text-primary" variant="secondary">
            <Link href="#plans">Ver como funciona</Link>
          </Button>
        </div>
      </Slider>
    </section>
  );
}
