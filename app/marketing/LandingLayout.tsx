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
import Hero from "./sections/Hero";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";
import ContactSection from "./sections/ContactSection";

export default function LandingLayout() {
const handleScroll = (
  event: React.MouseEvent<HTMLAnchorElement>,
  targetId: string,
  closeMenu?: boolean,
) => {
  event.preventDefault();
  const targetElement = document.querySelector(targetId);
  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  if (closeMenu) {
    setMenuOpen(false);
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
      <Hero />
      <Functionalities />
      <Testimonials />
      <Plans />
      <CallToAction />
      <FAQ />
      <ContactSection whatsappNumber="5548991447684" whatsappMessage="Olá! Quero conhecer melhor o Chopp Hub." />
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
