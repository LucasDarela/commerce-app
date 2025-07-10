"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils"; // ou substitua por classes diretamente

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 100) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      aria-label="Voltar ao topo"
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300",
        visible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-90 pointer-events-none",
      )}
      style={{ width: 48, height: 48 }}
    >
      <div className="relative w-6 h-6">
        <ArrowUp
          className="absolute inset-0 w-6 h-6 text-primary"
          strokeWidth={2.5}
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute top-0 left-0 w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        ></svg>
      </div>
    </button>
  );
}
