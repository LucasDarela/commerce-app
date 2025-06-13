// "use client"

import { ResetOrUpdatePasswordForm } from "@/components/auth/ResetOrUpdatePasswordForm";

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { toast } from "sonner"
// import { PasswordInput } from "@/components/ui/password-input"

// export default function UpdatePasswordPage() {
//   const router = useRouter()
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [confirm, setConfirm] = useState("")
//   const [loading, setLoading] = useState(false)
//   const [tokenChecked, setTokenChecked] = useState(false)

//   useEffect(() => {
//     const verifySession = async () => {
//       const { data, error } = await supabase.auth.getUser()
//       if (error || !data.user) {
//         toast.error("Token inválido ou expirado.")
//       } else {
//         setEmail(data.user.email ?? "")
//       }
//       setTokenChecked(true)
//     }

//     verifySession()
//   }, [])

//   const handleResetPassword = async () => {
//     if (!password || !confirm) {
//       return toast.error("Preencha os dois campos.")
//     }

//     if (password !== confirm) {
//       return toast.error("As senhas não coincidem.")
//     }

//     setLoading(true)

//     const { error } = await supabase.auth.updateUser({ password })

//     setLoading(false)

//     if (error) {
//       toast.error("Erro ao redefinir senha.")
//       console.error(error)
//     } else {
//       toast.success("Senha atualizada com sucesso.")
//       router.push("/login")
//     }
//   }

//   if (!tokenChecked) {
//     return <p className="text-center mt-10">Verificando token...</p>
//   }

//   return (
//     <div className="max-w-md mx-auto py-10 px-4">
//       <h2 className="text-xl font-bold mb-6">Redefinir Senha</h2>

//       <div className="space-y-4">
//         <Input
//           value={email}
//           disabled
//           className="bg-muted"
//         />
//           <PasswordInput
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="Nova senha"
//           />

//           <PasswordInput
//             value={confirm}
//             onChange={(e) => setConfirm(e.target.value)}
//             placeholder="Confirmar nova senha"
//           />
//         <Button onClick={handleResetPassword} disabled={loading} className="w-full">
//           {loading ? "Salvando..." : "Redefinir Senha"}
//         </Button>
//       </div>
//     </div>
//   )
// }

export default function UpdatePasswordDashboard() {
  return <ResetOrUpdatePasswordForm />;
}
