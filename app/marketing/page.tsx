import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingLayout from "./sections/LandingLayout";

export default async function LandingPage() {
  const supabase = createServerComponentClient({ cookies });

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      return redirect("/dashboard");
    }
  } catch (error) {
    console.log("LandingPage: Erro ao verificar sessão, ignorando:", error?.message);
    // não faz nada, apenas segue para a landing page
  }

  return <LandingLayout />;
}