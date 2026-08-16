import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppShell, SearchBar } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { RequireProfile } from "@/components/RequireProfile";
import { CATEGORIES } from "@/lib/data";
import { useStore } from "@/lib/store";
import * as Icons from "lucide-react";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Home — Campus Mart" }] }),
  component: () => <RequireProfile><Dashboard /></RequireProfile>,
});

const BANNERS = [
  { title: "Semester Sale", subtitle: "Up to 70% off on engineering books", cta: "Shop Books", color: "from-brand to-brand-2" },
  { title: "Hostel Essentials", subtitle: "Tables, lamps, study gear & more", cta: "Browse Now", color: "from-orange to-orange" },
  { title: "Sell what you don't need", subtitle: "List in under a minute", cta: "Start Selling", color: "from-brand-2 to-brand" },
];

let renderCounter = 0;

function Dashboard() {
  renderCounter++;
  const { allProducts } = useStore();
  const [q, setQ] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);

  // Instrumentation logging as requested
  console.log(`[HOMEPAGE DIAGNOSTIC] Render #${renderCounter}`);
  console.log(`[HOMEPAGE DIAGNOSTIC] Fetch Count (Store items): ${allProducts.length}`);
  console.log(`[HOMEPAGE DIAGNOSTIC] Returned Row IDs:`, allProducts.map((p) => p.id));

  const filtered = allProducts.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.category.toLowerCase().includes(q.toLowerCase())
  );

  console.log(`[HOMEPAGE DIAGNOSTIC] Filtered State Length: ${filtered.length}`);

  // FIX: When products list is small (e.g. 1 item), do NOT repeat the same product in Trending, Recent, and Recommended!
  // Distribute products or display a single clean 'Featured Listings' section so 1 record is rendered as 1 card.
  const isSmallCatalog = filtered.length <= 4;
  const trending = filtered.slice(0, 8);
  const recent = isSmallCatalog ? [] : filtered.slice(4, 12);
  const recommended = isSmallCatalog ? [] : filtered.slice(8, 16);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-10">
        <div className="max-w-2xl">
          <SearchBar value={q} onChange={setQ} />
        </div>

        {/* Banner carousel */}
        <div className="relative">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${BANNERS[bannerIdx].color} p-8 sm:p-12 text-primary-foreground min-h-[200px] sm:min-h-[240px] shadow-xl`}>
            <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full bg-card/10 blur-3xl" />
            <div className="relative max-w-md">
              <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">Featured</div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold">{BANNERS[bannerIdx].title}</h2>
              <p className="mt-2 opacity-90">{BANNERS[bannerIdx].subtitle}</p>
              <Link to="/marketplace" className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-card text-brand font-semibold hover:scale-105 transition text-sm">
                {BANNERS[bannerIdx].cta}
              </Link>
            </div>
            <button onClick={() => setBannerIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length)} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/20 backdrop-blur hover:bg-card/30 flex items-center justify-center" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => setBannerIdx((i) => (i + 1) % BANNERS.length)} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/20 backdrop-blur hover:bg-card/30 flex items-center justify-center" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {BANNERS.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)} className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "w-6 bg-card" : "w-1.5 bg-card/40"}`} aria-label={`Slide ${i+1}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        <section>
          <h2 className="text-xl font-bold mb-4">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = (Icons as any)[cat.icon] ?? Icons.Box;
              return (
                <Link
                  key={cat.name}
                  to="/marketplace"
                  search={{ category: cat.name }}
                  className="card-soft p-4 flex flex-col items-center gap-2.5 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground group-hover:scale-110 transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium text-center line-clamp-2">{cat.name}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {allProducts.length === 0 ? (
          <EmptyState subtitle="No products have been listed yet. Be the first student to post one and kickstart your campus marketplace!" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No items found. Be the first to post one!"
            subtitle="Try a different search or list this item yourself."
            ctaLabel="Post a Listing"
          />
        ) : (
          <>
            <Row title={isSmallCatalog ? "Fresh Campus Listings" : "Trending Products"} icon={TrendingUp} items={trending} />
            {recent.length > 0 && <Row title="Recently Added" icon={Clock} items={recent} />}
            {recommended.length > 0 && <Row title="Recommended for You" icon={Sparkles} items={recommended} />}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ title, icon: Icon, items }: { title: string; icon: any; items: any[] }) {
  if (!items.length) return null;
  console.log(`[HOMEPAGE DIAGNOSTIC] Section "${title}" rendering ${items.length} card(s)`);
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon className="h-5 w-5 text-orange" />
          {title}
        </h2>
        <Link to="/marketplace" className="text-sm font-medium text-brand-2 hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
