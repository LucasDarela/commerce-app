// app/dashboard/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, Trash2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabase } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  description: string;
  date: string; // timestamp
  read: boolean;
}

export default function NotificationsPage() {
  const supabase = createClientComponentClient<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, description, date, read")
        .order("date", { ascending: false });

      if (!error && data && mounted) {
        setNotifications(data as Notification[]);
      }
      setLoading(false);
    }

    fetchNotifications();

    // Realtime: recebe novas notificações da sua empresa (RLS filtra)
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const n = payload.new as unknown as Notification;
          // joga no topo
          setNotifications((prev) => [n, ...prev]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const markAsRead = async (id: string) => {
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) return <div className="px-4 py-8">Carregando…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6" />
        Notificações
      </h1>
      <Separator />

      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-center mt-12">
          Está quieto aqui.
        </p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition border ${
                notification.read ? "opacity-60" : ""
              }`}
            >
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.date).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!notification.read && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="w-4 h-4" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
