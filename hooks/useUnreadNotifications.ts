// hooks/useUnreadNotifications.ts
"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function useUnreadNotifications() {
  const supabase = createBrowserSupabaseClient();
  const [count, setCount] = useState(0);

  const fetchUnread = async () => {
    const {
      data,
      error,
      count: total,
    } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);

    if (!error && typeof total === "number") {
      setCount(total);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
