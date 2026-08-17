import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { formatINR, type Product } from "@/lib/data";
import { useStore } from "@/lib/store";

export function ProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggleWishlist } = useStore();
  const wished = isWishlisted(product.id);
  const isSoldOut = Boolean(product.sold) || product.quantity === 0;

  return (
    <div className={`group card-soft overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 flex flex-col ${isSoldOut ? "opacity-90" : ""}`}>
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square bg-muted overflow-hidden"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ${isSoldOut ? "grayscale-[30%]" : ""}`}
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card/95 backdrop-blur shadow-sm flex items-center justify-center hover:scale-110 transition z-10"
          aria-label="Wishlist"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${wished ? "fill-orange text-orange" : "text-muted-foreground"}`}
          />
        </button>
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
          <div className="text-[10px] uppercase tracking-wider font-semibold bg-card/95 backdrop-blur px-2 py-1 rounded-full text-brand shadow-xs">
            {product.condition}
          </div>
          {isSoldOut && (
            <div className="text-[10px] uppercase tracking-wider font-bold bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full shadow-md animate-pulse">
              Sold Out
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <Link to="/product/$id" params={{ id: product.id }} className="font-semibold text-sm line-clamp-2 hover:text-brand-2 transition">
          {product.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{formatINR(product.price)}</span>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1">by {product.seller}</div>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className={`mt-2 inline-flex items-center justify-center h-9 rounded-lg text-sm font-medium transition-colors ${
            isSoldOut
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-secondary hover:bg-brand hover:text-brand-foreground text-secondary-foreground"
          }`}
        >
          {isSoldOut ? "Sold Out · View Details" : "View Details"}
        </Link>
      </div>
    </div>
  );
}
