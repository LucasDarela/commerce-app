import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSession = {
  user: {
    id: string;
    email?: string | null;
  };
  companyId: string;
  isAdmin: boolean;
  profile: {
    name: string;
    avatar?: string | null;
    email: string | null;
  };
};

export async function getServerUser(): Promise<ServerSession | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const userId = user.id;

  const { data: companyData, error: companyError } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!companyData || companyError) return null;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("name, avatar, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profileData || profileError) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    companyId: companyData.company_id,
    isAdmin: companyData.role === "admin",
    profile: {
      name: profileData.name,
      avatar: profileData.avatar,
      email: profileData.email,
    },
  };
}