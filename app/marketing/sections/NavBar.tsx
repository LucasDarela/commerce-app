"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import logo from "@/app/assets/logo-blue.png";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginAccountForm } from "@/components/auth/login-account-form";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Clientes", href: "#testimonials" },
  { label: "Preços", href: "#plans" },
  { label: "FAQ", href: "#faq" },
  { label: "Contato", href: "#contact" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
    closeMenu?: boolean,
  ) => {
    event.preventDefault();

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const y = (targetElement as HTMLElement).offsetTop - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }

    if (closeMenu) setMenuOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session?.user);
    }

    checkLogin();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, []);

  return (
    <div suppressHydrationWarning>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b bg-background/80 backdrop-blur-xl"
            : "bg-background/95",
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Chopp Hub"
          >
            <Image
              src={logo}
              alt="Logo Chopp Hub"
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="text-lg font-bold text-primary sm:text-xl">
              Chopp Hub
            </span>
          </Link>

          {/* Links desktop */}
          <ul className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => handleScroll(e, item.href)}
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions desktop */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <ThemeSelector />
            <ModeToggle />

            {!isLoggedIn && (
              <Button
                variant="outline"
                className="h-10 px-5 font-semibold"
                onClick={() => setLoginModalOpen(true)}
              >
                Entrar
              </Button>
            )}

            <Button asChild className="h-10 px-5 font-semibold">
              <Link href={isLoggedIn ? "/dashboard" : "/login-signin"}>
                {isLoggedIn ? "Ir para o dashboard" : "Começar teste grátis"}
              </Link>
            </Button>
          </div>

          {/* Actions mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeSelector />
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-20 z-[60] border-b bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <ul className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={(e) => handleScroll(e, item.href, true)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2">
              {!isLoggedIn && (
                <Button
                  variant="outline"
                  className="w-full h-11 font-semibold"
                  onClick={() => {
                    setMenuOpen(false);
                    setLoginModalOpen(true);
                  }}
                >
                  Entrar
                </Button>
              )}

              <Button asChild className="w-full h-11 font-semibold">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login-signin"}
                  onClick={() => setMenuOpen(false)}
                >
                  {isLoggedIn ? "Ir para o dashboard" : "Começar teste grátis"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              Entrar na sua conta
            </DialogTitle>
          </DialogHeader>
          <LoginAccountForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
