"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = createClientComponentClient();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
    closeMenu?: boolean,
  ) => {
    event.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: (targetElement as HTMLElement).offsetTop - 5,
        behavior: "smooth",
      });
    }
    if (closeMenu) {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🔹 Verifica se o usuário está logado
  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session?.user);
    }

    checkLogin();

    // Atualiza estado quando o usuário logar/deslogar
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <div suppressHydrationWarning>
      {/* Navbar Responsiva */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-transparent backdrop-blur-md shadow-none"
            : "bg-background shadow-md"
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          {/* Logo */}
          <h1 className="md:text-1xl lg:text-2xl font-bold text-primary">
            Chopp Hub
          </h1>

          {/* Links (desktop) */}
          <ul className="hidden md:flex gap-6 text-sm font-medium">
            <li className="hover:text-primary">
              <Link
                href="#features"
                onClick={(e) => handleScroll(e, "#features", true)}
              >
                Funcionalidades
              </Link>
            </li>
            <li className="hover:text-primary">
              <Link
                href="#plans"
                onClick={(e) => handleScroll(e, "#plans", true)}
              >
                Preços
              </Link>
            </li>
            <li className="hover:text-primary">
              <Link
                href="#testimonials"
                onClick={(e) => handleScroll(e, "#testimonials", true)}
              >
                Clientes
              </Link>
            </li>
            <li className="hover:text-primary">
              <Link
                href="#footer"
                onClick={(e) => handleScroll(e, "#footer", true)}
              >
                Contato
              </Link>
            </li>
            <li className="hover:text-primary">
              <Link href="#faq" onClick={(e) => handleScroll(e, "#faq", true)}>
                Ajuda
              </Link>
            </li>
          </ul>

          {/* Botões */}
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <ModeToggle />

            <div className="hidden md:block">
              <Button asChild>
                <Link href={isLoggedIn ? "/dashboard" : "/login-signin"}>
                  {isLoggedIn ? "Dashboard" : "Sign In"}
                </Link>
              </Button>
            </div>

            {/* Menu Mobile */}
            <div className="block md:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMenu}>
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <ul className="bg-muted shadow-md fixed top-16 left-0 w-full flex flex-col items-center p-4 space-y-4 z-[9999]">
            {/* links mobile */}
          </ul>
        )}
      </nav>

      {/* Dropdown do Mobile Menu */}
      {menuOpen && (
        <ul className="bg-muted shadow-md fixed top-16 left-0 w-full flex flex-col items-center p-4 space-y-4 z-[9999]">
          <li className="hover:text-primary">
            <Link
              href="#features"
              onClick={(e) => handleScroll(e, "#features", true)}
            >
              Funcionalidades
            </Link>
          </li>
          <li className="hover:text-primary">
            <Link
              href="#plans"
              onClick={(e) => handleScroll(e, "#plans", true)}
            >
              Preços
            </Link>
          </li>
          <li className="hover:text-primary">
            <Link
              href="#testimonials"
              onClick={(e) => handleScroll(e, "#testimonials", true)}
            >
              Clientes
            </Link>
          </li>
          <li className="hover:text-primary">
            <Link
              href="#footer"
              onClick={(e) => handleScroll(e, "#footer", true)}
            >
              Contato
            </Link>
          </li>
          <li className="hover:text-primary">
            <Link href="#faq" onClick={(e) => handleScroll(e, "#faq", true)}>
              Ajuda
            </Link>
          </li>
          <li>
            <Button asChild>
              <Link
                href={isLoggedIn ? "/dashboard" : "/login-signin"}
                onClick={toggleMenu}
              >
                {isLoggedIn ? "Dashboard" : "Sign In"}
              </Link>
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
}
