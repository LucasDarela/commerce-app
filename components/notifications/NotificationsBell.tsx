"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Trash2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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
  date: string;
  read: boolean;
};

export default function NotificationBell() {
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
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
  }, []);

  async function markAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
  }

  async function deleteOne(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function markAllAsRead() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .in("id", ids);
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

      <PopoverContent
        align="end"
        className="w-[400px] p-0 overflow-hidden rounded-xl shadow-xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notificações</span>
            {unread > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {unread} nova{unread > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={markAllAsRead}
              disabled={unread === 0}
            >
              Ler todas
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
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhuma notificação.
            </div>
          ) : (
            items.map((n) => {
              const isPaid = n.title.toLowerCase().includes("pagamento");
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  {/* Ícone colorido */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isPaid
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        isPaid
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">
                      {n.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(n.date).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => markAsRead(n.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteOne(n.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
