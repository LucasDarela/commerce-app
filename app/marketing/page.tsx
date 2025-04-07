import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingLayout from "./sections/LandingLayout";

export default async function LandingPage() {
  const supabase = createServerComponentClient({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      return redirect("/dashboard");
    }
  } catch (error) {
    console.log("Erro:", (error as { message?: string })?.message);
  }

  return <LandingLayout />;
}