import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { formatINR } from "@/lib/data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Wallet, MessageSquarePlus } from "lucide-react";

export const Route = createFileRoute("/request")({
  head: () => ({ meta: [{ title: "Requests — Campus Mart" }] }),
  component: Requests,
});

type ItemRequest = {
  id: string;
  title: string;
  budget: number;
  description: string;
  by: string;
  dept: string;
};

const LS_KEY_REQUESTS = "campus_mart_user_requests";

function getStoredRequests(): ItemRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY_REQUESTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function Requests() {
  const { profile } = useStore();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ItemRequest[]>([]);
  const [form, setForm] = useState({ title: "", budget: "", description: "" });

  useEffect(() => {
    setList(getStoredRequests());
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const newReq: ItemRequest = {
      id: "req_" + Date.now(),
      title: form.title.trim(),
      budget: Number(form.budget) || 0,
      description: form.description.trim(),
      by: profile?.name || "Student",
      dept: profile ? `${profile.department}, ${profile.year}` : "Campus Student",
    };

    const updated = [newReq, ...list];
    setList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_REQUESTS, JSON.stringify(updated));
    }
    setForm({ title: "", budget: "", description: "" });
    setOpen(false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Item Requests</h1>
            <p className="mt-1 text-muted-foreground text-sm">Can't find what you need? Post a request and let sellers come to you.</p>
          </div>
          <button onClick={() => setOpen(!open)} className="shrink-0 h-11 px-5 rounded-full gradient-brand text-primary-foreground font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition">
            <Plus className="h-4 w-4" /> New Request
          </button>
        </div>

        {open && (
          <form onSubmit={submit} className="mt-6 card-soft p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid sm:grid-cols-[1fr_180px] gap-4">
              <label className="block">
                <span className="text-sm font-medium">Title</span>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Need Engineering Mathematics Book" className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Budget (₹)</span>
                <input required type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="250" className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Description</span>
              <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Looking for a second-hand copy in decent condition." className="mt-1.5 w-full px-3 py-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none" />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg hover:bg-muted text-sm font-medium">Cancel</button>
              <button type="submit" className="h-10 px-5 rounded-lg gradient-brand text-primary-foreground text-sm font-semibold">Post Request</button>
            </div>
          </form>
        )}

        {list.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={MessageSquarePlus}
              title="No Item Requests Yet"
              subtitle="Looking for a textbook, calculator, or hostel gear? Click 'New Request' above to post what you need!"
            />
          </div>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {list.map((r) => (
              <div key={r.id} className="card-soft p-5 hover:shadow-[var(--shadow-card-hover)] transition">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{r.title}</h3>
                  <span className="text-xs font-semibold text-orange flex items-center gap-1 shrink-0"><Wallet className="h-3 w-3" /> {formatINR(r.budget)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">by {r.by} · {r.dept}</div>
                  <button className="text-sm font-semibold text-brand-2 hover:underline">Respond</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
