"use client";

import Link from "next/link";
import React from "react";
import Slider from "react-slick";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import heroImage1 from "@/app/assets/hero-img1.png";
import heroImage2 from "@/app/assets/hero-img2.png";
import heroImage3 from "@/app/assets/hero-img3.png";

const slides = [
  {
    image: heroImage1,
    title: "Tenha controle total da sua distribuidora de bebidas",
    description:
      "Controle pedidos, estoque, entregas e financeiro da sua distribuidora em um único sistema.",
    cta: "Começar teste grátis",
  },
  {
    image: heroImage2,
    title: "Pare de perder dinheiro com sua distribuidora de chopp desorganizada",
    description:
      "Acompanhe vendas, estoque e clientes em tempo real e tome decisões com dados reais do seu negócio.",
    cta: "Testar por 30 dias grátis",
  },
  {
    image: heroImage3,
    title: "Organize suas entregas e nunca mais perca pedidos",
    description:
      "Agende entregas, gerencie pedidos e mantenha sua operação funcionando sem confusão.",
    cta: "Ver como funciona",
  },
];

export default function Hero() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 1500,
    autoplay: true,
    autoplaySpeed: 8000,
    arrows: false,
    pauseOnHover: false,
    lazyLoad: "ondemand" as const,
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <Slider {...settings} className="h-full">
        {slides.map((slide, index) => {
          const isFirstSlide = index === 0;

          return (
            <div key={index}>
              <div className="relative h-screen w-full">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={isFirstSlide}
                  loading={isFirstSlide ? "eager" : "lazy"}
                  fetchPriority={isFirstSlide ? "high" : "low"}
                  className="object-cover"
                  sizes="100vw"
                />

                <div className="absolute inset-0 bg-black/50" />

                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <div className="max-w-3xl text-center text-white">
                    <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
                      {slide.title}
                    </h1>

                    <p className="mt-4 text-base text-white/90 sm:text-lg md:text-xl">
                      {slide.description}
                    </p>

                    <div className="mt-8">
                      <Button
                        asChild
                        size="lg"
                        className="h-12 px-8 text-base font-semibold"
                      >
                        <Link href="#plans">{slide.cta}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Slider>
    </section>
  );
}