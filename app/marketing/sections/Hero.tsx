import Link from "next/link";
import React from "react";

export default function Hero() {
  return (
    <section className="text-center py-20 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
      <h2 className="text-4xl font-bold">
        Gerencie sua Distribuidora de Chopp com Facilidade
      </h2>
      <p className="mt-4 text-lg">
        Automatize vendas, estoque e entregas com nosso sistema SaaS.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-block px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
      >
        Experimente Agora
      </Link>
    </section>
  );
}
