import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  ShoppingBag,
  HelpCircle,
  Heart,
  Bell,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Campus Mart" }] }),
  component: () => <RequireProfile><Notifications /></RequireProfile>,
});

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

const TYPE_META: Record<string, { icon: any; color: string }> = {
  new_message:    { icon: MessageCircle, color: "text-brand-2 bg-brand-2/10" },
  order_placed:   { icon: ShoppingBag,   color: "text-green-600 bg-green-500/10" },
  order_received: { icon: ShoppingBag,   color: "text-orange bg-orange/10" },
  wishlist_update:{ icon: Heart,         color: "text-destructive bg-destructive/10" },
  request:        { icon: HelpCircle,    color: "text-brand bg-brand/10" },
};

function Notifications() {
  const { user } = useStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }

  useEffect(() => { loadNotifications(); }, [user]);

  // Real-time: new notifications appear instantly
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((cur) => [payload.new as Notification, ...cur]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full gradient-brand text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Recent activity on your listings, chats and orders.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-2 hover:underline"
            >
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">
              You'll be notified about messages, orders and more.
            </p>
          </div>
        ) : (
          <div className="mt-6 card-soft divide-y divide-border overflow-hidden">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-brand bg-brand/10" };
              const Icon = meta.icon;
              const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markOneRead(n.id); }}
                  className={`p-4 flex items-start gap-3 hover:bg-muted/40 transition cursor-pointer ${
                    !n.read ? "bg-accent/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{timeAgo}</div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="h-2 w-2 rounded-full bg-orange shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
