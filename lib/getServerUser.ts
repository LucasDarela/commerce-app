import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/auth-helpers-nextjs";

type ServerSession = {
  user: User;
  companyId: string;
  isAdmin: boolean;
  profile: {
    name: string;
    avatar?: string;
    email: string;
  };
};

export async function getServerUser(): Promise<ServerSession | null> {
  const supabase = createServerComponentClient({ cookies });

  // 1. Get user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const userId = user.id;

  // 2. Get company info
  const { data: companyData, error: companyError } = await supabase
    .from("company_users")
    .select("company_id, is_admin")
    .eq("user_id", userId)
    .single();

  if (!companyData || companyError) return null;

  // 3. Get profile info
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("name, avatar, email")
    .eq("id", userId)
    .single();

  if (!profileData || profileError) return null;

  // 4. Return all combined
  return {
    user,
    companyId: companyData.company_id,
    isAdmin: companyData.is_admin,
    profile: {
      name: profileData.name,
      avatar: profileData.avatar,
      email: profileData.email,
    },
  };
}
