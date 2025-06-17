import Link from "next/link";
import React from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);

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
          <li>
            <Link href="#features">Funcionalidades</Link>
          </li>
          <li>
            <Link href="#pricing">Preços</Link>
          </li>
          <li>
            <Link href="#testimonials">Clientes</Link>
          </li>
          <li>
            <Link href="#contact">Contato</Link>
          </li>
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
          <li>
            <Link href="#features" onClick={toggleMenu}>
              Funcionalidades
            </Link>
          </li>
          <li>
            <Link href="#pricing" onClick={toggleMenu}>
              Preços
            </Link>
          </li>
          <li>
            <Link href="#testimonials" onClick={toggleMenu}>
              Clientes
            </Link>
          </li>
          <li>
            <Link href="#contact" onClick={toggleMenu}>
              Contato
            </Link>
          </li>
          <li>
            <Button asChild>
              <Link href="/login-signin" onClick={toggleMenu}>
                Log In
              </Link>
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
}
