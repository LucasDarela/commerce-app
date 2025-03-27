import React from "react";

export default function Funcionalidades() {
  return (
    <section id="features" className="py-20 text-center">
    <h2 className="text-3xl font-bold">Principais Funcionalidades</h2>
    <p className="mt-2 text-gray-600">Tudo o que você precisa para gerenciar sua distribuidora.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 px-6">
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h3 className="text-xl font-semibold">Gestão de Pedidos</h3>
        <p className="mt-2 text-gray-600">Crie, gerencie e acompanhe pedidos de forma eficiente.</p>
      </div>
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h3 className="text-xl font-semibold">Controle de Estoque</h3>
        <p className="mt-2 text-gray-600">Automatize a atualização do estoque conforme as vendas.</p>
      </div>
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h3 className="text-xl font-semibold">Agendamento de Entregas</h3>
        <p className="mt-2 text-gray-600">Defina e acompanhe entregas com facilidade.</p>
      </div>
    </div>
  </section>
    );
}