import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, SearchBar } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { RequireProfile } from "@/components/RequireProfile";
import { CATEGORIES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { SlidersHorizontal } from "lucide-react";

type MarketSearch = { category?: string };

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — Campus Mart" }] }),
  validateSearch: (s: Record<string, unknown>): MarketSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  component: () => <RequireProfile><Marketplace /></RequireProfile>,
});

function Marketplace() {
  const search = useSearch({ from: "/marketplace" });
  const { allProducts } = useStore();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(search.category);
  const [sort, setSort] = useState<"recent" | "low" | "high">("recent");

  const list = useMemo(() => {
    let out = allProducts.filter((p) =>
      (!category || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "low") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "high") out = [...out].sort((a, b) => b.price - a.price);
    return out;
  }, [allProducts, category, q, sort]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground text-sm">Browse listings from students across your campus.</p>
        </div>

        <div className="mt-6 grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Filters */}
          <aside className="card-soft p-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center gap-2 font-semibold mb-4">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Category</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCategory(undefined)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition ${!category ? "bg-brand text-brand-foreground" : "hover:bg-muted"}`}
              >
                All Categories
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition ${category === c.name ? "bg-brand text-brand-foreground" : "hover:bg-muted"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="mt-6 text-xs font-semibold uppercase text-muted-foreground mb-2">Sort by</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm outline-none focus:border-brand-2"
            >
              <option value="recent">Most Recent</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </aside>

          <div>
            <div className="mb-4"><SearchBar value={q} onChange={setQ} placeholder="Search in marketplace…" /></div>
            {list.length > 0 && (
              <div className="mb-3 text-sm text-muted-foreground">{list.length} {list.length === 1 ? "item" : "items"}</div>
            )}
            {list.length === 0 ? (
              allProducts.length === 0 ? (
                <EmptyState subtitle="Be the first student to list something on your campus marketplace." />
              ) : (
                <EmptyState
                  title="No items found. Be the first to post one!"
                  subtitle="Try a different search or category, or list this item yourself."
                  ctaLabel="Post a Listing"
                />
              )
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
