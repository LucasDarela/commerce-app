"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NavUser } from "./nav-user"; 

export default function NavUserWrapper() {
  const supabase = createClientComponentClient();
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, email, avatar")
        .eq("id", user.id)
        .single();

      if (!error && profile) {
        setUserData({
          name: profile.username || "User",
          email: profile.email,
          avatar: profile.avatar || "https://dummyimage.com/150",
        });
      }
    };

    fetchUserData();
  }, []);

  if (!userData) return null; 

  return <NavUser user={userData} />;
}