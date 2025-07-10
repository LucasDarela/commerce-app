import { redirect } from "next/navigation";
import LandingLayout from "./LandingLayout";
import { getServerUser } from "@/lib/getServerUser";

export default async function LandingPage() {
  const session = await getServerUser();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingLayout />;
}
