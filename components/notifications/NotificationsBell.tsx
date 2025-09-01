"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Trash2 } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/components/types/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  title: string;
  description: string;
  date: string; // timestamp/ISO
  read: boolean;
};

export default function NotificationBell() {
  const supabase = createClientComponentClient<Database>();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const unread = items.filter((i) => !i.read).length;

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, description, date, read")
        .order("date", { ascending: false })
        .limit(20);

      if (!error && data && mounted) setItems(data as Notification[]);
      setLoading(false);
    })();

    const ch = supabase
      .channel("notif-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as unknown as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  async function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function deleteOne(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function markAllAsRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unread > 0 && (
            <Badge
              className="absolute -right-1 -top-1 px-1.5 py-0 h-5 min-w-5 rounded-full text-[10px] leading-none"
              variant="destructive"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
          <span className="sr-only">Abrir notificações</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-sm">
            Notificações{" "}
            {unread > 0 && (
              <span className="text-muted-foreground text-xs">
                • {unread} novas
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={markAllAsRead}
              disabled={unread === 0}
            >
              Ler Todas
            </Button>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
            >
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                Ver todas
              </Button>
            </Link>
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Sem notificações.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`grid grid-cols-[24px,1fr,72px] gap-3 px-4 py-3 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  {/* conteúdo */}
                  <div className="min-w-0 max-h-4">
                    <div className="font-medium text-sm truncate">
                      {n.title}
                    </div>
                    <div className="text-xs text-muted-foreground break-words">
                      {n.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.date).toLocaleString()}
                    </div>
                  </div>

                  {/* ações – largura fixa para manter alinhamento */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Placeholder invisível quando já lida, para não “pular” */}
                    {n.read ? (
                      <span className="w-8 h-8 inline-block" aria-hidden />
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => markAsRead(n.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteOne(n.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
