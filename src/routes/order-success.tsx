import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatINR } from "@/lib/data";
import { CheckCircle2, MapPin } from "lucide-react";

type Search = { id?: string };

export const Route = createFileRoute("/order-success")({
  head: () => ({ meta: [{ title: "Order Confirmed — Campus Mart" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const { id } = useSearch({ from: "/order-success" });
  const { allProducts } = useStore();
  const product = allProducts.find((p) => p.id === id);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <div className="card-soft p-8 sm:p-12 text-center">
          <div className="h-20 w-20 rounded-full gradient-brand mx-auto flex items-center justify-center text-primary-foreground shadow-lg animate-in zoom-in">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Order Confirmed!</h1>
          <p className="mt-2 text-muted-foreground">Your request has been sent to the seller. They'll coordinate the campus pickup with you on chat.</p>

          {product && (
            <div className="mt-8 flex items-center gap-4 p-4 rounded-2xl bg-muted text-left">
              <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground">Seller: {product.seller}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatINR(product.price)}</div>
                <div className="text-[10px] text-muted-foreground">Order ID #{product.id.toUpperCase()}</div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> Pickup on campus
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/chat" className="h-11 px-5 rounded-full gradient-brand text-primary-foreground text-sm font-semibold flex items-center justify-center">
              Chat with Seller
            </Link>
            <Link to="/marketplace" className="h-11 px-5 rounded-full bg-card border border-border text-sm font-semibold flex items-center justify-center hover:bg-muted">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
