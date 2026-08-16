import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Campus Mart" }] }),
  component: () => <RequireProfile><Wishlist /></RequireProfile>,
});

function Wishlist() {
  const { allProducts, wishlist } = useStore();
  const items = allProducts.filter((p) => wishlist.includes(p.id));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Your Wishlist</h1>
        <p className="mt-1 text-muted-foreground text-sm">Items you've saved to view later.</p>

        {items.length === 0 ? (
          <div className="card-soft mt-8 p-12 text-center">
            <div className="h-14 w-14 rounded-full bg-accent mx-auto flex items-center justify-center">
              <Heart className="h-6 w-6 text-orange" />
            </div>
            <h2 className="mt-4 font-semibold">Your wishlist is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
            <Link to="/marketplace" className="mt-5 inline-flex h-10 px-5 rounded-full gradient-brand text-primary-foreground text-sm font-semibold items-center">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
