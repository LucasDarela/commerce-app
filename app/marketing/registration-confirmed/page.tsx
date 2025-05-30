"use client"

import { useEffect } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"
import { Button } from "@/components/ui/button"

export default function RegistrationConfirmed() {
  useEffect(() => {
    // Dispara confetes ao montar o componente
    confetti({
      particleCount: 100,
      spread: 160,
      origin: { y: 0.6 }
    })
  }, [])

  return (
    <main className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-6 p-6 rounded-2xl shadow-xl border bg-card max-w-md w-full animate-fade-in">
        <h1 className="text-2xl font-bold">🎉 Conta criada com sucesso!</h1>
        <p className="text-muted-foreground">Acesse a página de login para começar a usar o sistema.</p>
        <Link href="/login-signin">
          <Button className="w-full">Ir para Login</Button>
        </Link>
      </div>
    </main>
  )
}