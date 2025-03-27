import { createServerComponentClient} from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import LandingLayout from "./sections/LandingLayout";

export default async function LandingPage() {

  let loggedIn = false;
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
  
    if (session) loggedIn = true;
  } catch (error) {
    console.log("Landing Page: ", error);
  } finally {
    if (loggedIn) redirect("/dashboard");
  }

  return (
    <LandingLayout />
  );
}