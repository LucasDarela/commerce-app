"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany"
import { PasswordInput } from "../ui/password-input"

export function ResetOrUpdatePasswordForm() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { user, loading } = useAuthenticatedCompany()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sessionRestored, setSessionRestored] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detecta se o usuário veio de um link de recuperação de senha
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setSessionRestored(true)
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [supabase])

  // Se o usuário já estiver autenticado no sistema
  useEffect(() => {
    if (!loading && user) {
      setSessionRestored(true)
    }
  }, [loading, user])

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }

    if (!sessionRestored) {
      toast.error("Sessão não ativa. Acesse via link do e-mail.")
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error("Erro ao atualizar a senha.")
      console.error(error)
    } else {
      toast.success("Senha atualizada com sucesso.")
      router.push("/login-signin")
    }

    setIsSubmitting(false)
  }

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">Atualizar Senha</h1>

      <PasswordInput
        type="password"
        placeholder="Nova senha"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <PasswordInput
        type="password"
        placeholder="Confirmar nova senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Atualizando..." : "Salvar Senha"}
      </Button>
    </div>
  )
}