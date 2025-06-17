"use client";

import avatar1 from "@/app/assets/avatar-1.webp";
import avatar2 from "@/app/assets/avatar-2.webp";
import avatar3 from "@/app/assets/avatar-3.webp";
import avatar4 from "@/app/assets/avatar-4.webp";
import avatar5 from "@/app/assets/avatar-5.webp";
import avatar6 from "@/app/assets/avatar-6.webp";
import avatar7 from "@/app/assets/avatar-7.webp";
import avatar8 from "@/app/assets/avatar-8.webp";
import avatar9 from "@/app/assets/avatar-9.webp";
import Image from "next/image";
import { motion } from "framer-motion";
import React from "react";

import type { HTMLAttributes } from "react";
import type { MotionProps } from "framer-motion";
const MotionDiv = motion<HTMLAttributes<HTMLDivElement> & MotionProps>("div");

const testimonials = [
  {
    text: "Com o Chopp Hub, finalmente consegui organizar meus pedidos com muito mais facilidade! Sistema excelente! 🍻",
    imageSrc: avatar1.src,
    name: "Márcia Junks",
    username: "@marcia_junks",
  },
  {
    text: "O sistema é muito ágil! Controlo tudo pela palma da minha mão! 🔥🍻",
    imageSrc: avatar2.src,
    name: "Roberto Santos",
    username: "@robertosantos",
  },
  {
    text: "Fácil de usar e o suporte é impecável! 👏👏",
    imageSrc: avatar3.src,
    name: "Fabio Nogueira",
    username: "@fabio_nogueira",
  },
  {
    text: "Organizar pedidos, logistica e financeiro ficou muito mais simples com o Chopp Hub! 🍻",
    imageSrc: avatar4.src,
    name: "Carlos Mendes",
    username: "@carlos_mendes",
  },
  {
    text: "Acompanhar barris e chopeiras ficou super fácil com o Chopp Hub. Controle total do estoque em tempo real! 🍻📦",
    imageSrc: avatar5.src,
    name: "Akira Santos",
    username: "@akira_santos",
  },
  {
    text: "O sistema de controle financeiro é completo! Vejo tudo da distribuidora em um só painel. Recomendo muito! 💰📊",
    imageSrc: avatar6.src,
    name: "Renata de Castro",
    username: "@renata_castro",
  },
  {
    text: "Com o Chopp Hub, a logística ficou fluida! Entregas, retiradas e comodatos organizados sem complicação. 🚚✅",
    imageSrc: avatar7.src,
    name: "Fernando Martinelli",
    username: "@fernando_martinelli",
  },
  {
    text: "Usabilidade impecável! Treinei a equipe em minutos e hoje todos usam no dia a dia da distribuidora. ⚙️🍺",
    imageSrc: avatar8.src,
    name: "Gabriela Alves",
    username: "@gabrielaalves",
  },
  {
    text: "Sistema completo: estoque, financeiro, logística e atendimento, tudo em um só lugar! Chopp Hub é revolucionário. 🔥🍻",
    imageSrc: avatar9.src,
    name: "Guilherme Joaquim",
    username: "@guilherme_j",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
  duration?: number;
}) => (
  <div className={props.className}>
    <MotionDiv
      animate={{ translateY: "-50%" }}
      transition={{
        duration: props.duration || 10,
        repeat: Infinity,
        ease: "linear",
        repeatType: "loop",
      }}
      className="flex flex-col gap-6 pb-6 will-change-transform"
    >
      {[...new Array(2)].fill(0).map((_, outerIndex) => (
        <React.Fragment key={`outer-${outerIndex}`}>
          {props.testimonials.map(
            ({ text, imageSrc, name, username }, innerIndex) => (
              <div className="card" key={`testimonial-${innerIndex}-${name}`}>
                <div>{text}</div>
                <div className="flex items-center gap-2 mt-5">
                  <Image
                    src={imageSrc}
                    alt={name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                  <div className="flex flex-col">
                    <div className="font-medium tracking-tight leading-5">
                      {name}
                    </div>
                    <div className="leading-5 tracking-tight">{username}</div>
                  </div>
                </div>
              </div>
            ),
          )}
        </React.Fragment>
      ))}
    </MotionDiv>
  </div>
);

export default function Testimonials() {
  return (
    <section className="my-16" id="clients">
      <div className="container mx-auto">
        <div className="section-heading section-header">
          <h2 className="section-title mt-5">O que nossos clientes dizem</h2>
          <p className="section-description mt-5">
            Experiências reais de quem já escolheu a qualidade e o sabor do
            nosso chopp
          </p>
        </div>
        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[738px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>
    </section>
  );
}
