import Link from "next/link";
import React from "react";

export default function NavBar() {
  return (
    <div>
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chopp SaaS</h1>
        <ul className="flex space-x-6">
          <li><Link href="#features">Funcionalidades</Link></li>
          <li><Link href="#pricing">Preços</Link></li>
          <li><Link href="#testimonials">Testemunhos</Link></li>
          <li><Link href="#contact">Contato</Link></li>
          <li><Link href="/login">Sign In</Link></li>
          <li><Link href="/signup" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Sign Up</Link></li>
        </ul>
      </nav>
     </div>
    );
}