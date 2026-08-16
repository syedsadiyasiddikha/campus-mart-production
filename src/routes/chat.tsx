import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({ meta: [{ title: "Chat — Campus Mart" }] }),
  component: () => <RequireProfile><Chat /></RequireProfile>,
});

type Thread = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  product_name: string;
  other_name: string;
};

type Msg = {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

const LS_KEY_LOCAL_CHATS = "campus_mart_local_chats";

function getLocalChats(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY_LOCAL_CHATS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalMsgs(chatId: string): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`campus_mart_msgs_${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMsg(msg: Msg) {
  if (typeof window === "undefined") return;
  const existing = getLocalMsgs(msg.chat_id);
  const updated = [...existing, msg];
  localStorage.setItem(`campus_mart_msgs_${msg.chat_id}`, JSON.stringify(updated));
}

function Chat() {
  const { id: queryChatId } = Route.useSearch();
  const { user, allProducts } = useStore();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load chat threads for current user
  useEffect(() => {
    if (!user) return;
    async function loadThreads() {
      setLoading(true);
      const localThreads = getLocalChats().filter(
        (t) => t.buyer_id === user.id || t.seller_id === user.id
      );

      try {
        const { data: chatsData, error: chatsErr } = await supabase
          .from("chats")
          .select("id, product_id, buyer_id, seller_id, created_at, products(name)")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (!chatsErr && chatsData) {
          const userIds = Array.from(
            new Set(chatsData.flatMap((c: any) => [c.buyer_id, c.seller_id]))
          );

          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", userIds);

          const profileMap = new Map(
            (profilesData ?? []).map((p: any) => [p.id, p.name])
          );

          const dbThreads: Thread[] = chatsData.map((c: any) => {
            const isBuyer = c.buyer_id === user.id;
            const otherId = isBuyer ? c.seller_id : c.buyer_id;
            return {
              id: c.id,
              product_id: c.product_id,
              buyer_id: c.buyer_id,
              seller_id: c.seller_id,
              product_name: c.products?.name ?? "Campus Item",
              other_name: profileMap.get(otherId) || (isBuyer ? "Seller" : "Buyer"),
            };
          });

          // Merge DB threads with local threads
          const combined = [...dbThreads, ...localThreads];
          const unique = Array.from(new Map(combined.map((t) => [t.id, t])).values());
          setThreads(unique);

          // Select active chat
          const targetId = queryChatId && unique.some((t) => t.id === queryChatId)
            ? queryChatId
            : (queryChatId || (unique.length > 0 ? unique[0].id : null));

          setActiveId(targetId);
          if (queryChatId) setMobileOpen(true);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Supabase chats fetch notice:", e);
      }

      // Fallback if DB fetch is empty/offline
      setThreads(localThreads);
      const fallbackTarget = queryChatId || (localThreads.length > 0 ? localThreads[0].id : null);
      setActiveId(fallbackTarget);
      if (queryChatId) setMobileOpen(true);
      setLoading(false);
    }

    loadThreads();
  }, [user, queryChatId]);

  // Load & Subscribe to Messages for Active Chat
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      const localMsgs = getLocalMsgs(activeId!);
      try {
        const { data: dbMsgs, error } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", activeId)
          .order("created_at", { ascending: true });

        if (!error && dbMsgs) {
          const combined = [...(dbMsgs as Msg[]), ...localMsgs];
          const uniqueMap = new Map(combined.map((m) => [m.id, m]));
          const sorted = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(sorted);
          return;
        }
      } catch (e) {
        console.warn("Messages fetch notice:", e);
      }
      setMessages(localMsgs);
    }

    loadMessages();

    // Supabase Realtime Subscription for incoming messages
    const channel = supabase
      .channel(`chat-realtime-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${activeId}`,
        },
        (payload) => {
          const newMsg = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId]
  );

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || !activeId) return;

    const body = text.trim();
    setText("");
    setSending(true);

    const newMsg: Msg = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      chat_id: activeId,
      sender_id: user.id,
      text: body,
      created_at: new Date().toISOString(),
    };

    // Save locally first for instant UI feedback & offline resilience
    saveLocalMsg(newMsg);
    setMessages((prev) => [...prev, newMsg]);

    // Send to Supabase DB
    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: activeId,
        sender_id: user.id,
        text: body,
      });
      if (error) console.warn("Supabase message insert notice:", error);
    } catch (err) {
      console.warn("Message sending exception:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Messages</h1>

        <div className="card-soft overflow-hidden grid md:grid-cols-[300px_1fr] h-[72vh]">
          {/* Left Thread List */}
          <aside className={`border-r border-border overflow-y-auto ${mobileOpen ? "hidden md:block" : "block"}`}>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No chats yet. Open a product and tap "Chat with Seller".
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveId(t.id);
                    setMobileOpen(true);
                  }}
                  className={`w-full text-left p-4 flex gap-3 border-b border-border hover:bg-muted transition ${
                    activeId === t.id ? "bg-accent/60 font-medium" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {t.other_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{t.other_name}</div>
                    <div className="text-xs text-brand-2 truncate">{t.product_name}</div>
                  </div>
                </button>
              ))
            )}
          </aside>

          {/* Right Active Chat Pane */}
          <section className={`flex flex-col ${mobileOpen ? "block" : "hidden md:flex"}`}>
            {active ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-muted"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {active.other_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{active.other_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Re: <span className="font-medium text-foreground">{active.product_name}</span>
                    </div>
                  </div>
                </div>

                {/* Messages List Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                      <div className="text-3xl mb-2">💬</div>
                      <p className="font-medium text-foreground">No messages yet</p>
                      <p className="text-xs mt-1">Send a message below to start your conversation with {active.other_name}.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              mine
                                ? "gradient-brand text-primary-foreground rounded-br-xs shadow-xs"
                                : "bg-card border border-border/80 text-foreground rounded-bl-xs shadow-xs"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input Box - Always enabled so buyer/seller can type & send */}
                <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2 bg-card">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Message ${active.other_name}…`}
                    className="flex-1 h-11 px-4 rounded-full bg-muted focus:bg-card border border-border focus:border-brand-2 outline-none text-sm transition"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="h-11 w-11 rounded-full gradient-brand text-primary-foreground flex items-center justify-center hover:opacity-95 transition shadow-md disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
                Select a chat thread to view and send messages.
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
