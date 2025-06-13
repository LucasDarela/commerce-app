"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const NotFoundAnimation = dynamic(
  () => import("@/components/not-found-animation"),
  {
    ssr: false,
  },
);

export default function NotFound() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center text-center px-4">
      <NotFoundAnimation />
      <h1 className="text-md sm:text-md font-bold mb-2 text-black">
        404 - Página não encontrada
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Opa! A página que você tentou acessar não existe ou foi removida.
      </p>
      <Link href="/dashboard">
        <Button variant="secondary">Voltar para o Inicio</Button>
      </Link>
    </div>
  );
}
