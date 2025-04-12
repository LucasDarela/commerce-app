// components/redirect-if-authenticated.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Loader2 } from "lucide-react"

export function RedirectIfAuthenticated() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push("/dashboard")
      } else {
        setChecking(false)
      }
    }

    checkSession()
  }, [router, supabase])

  if (!checking) return null

  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p>Você está sendo redirecionado...</p>
    </div>
  )
}