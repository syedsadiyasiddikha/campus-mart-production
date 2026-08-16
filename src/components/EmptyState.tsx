import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title = "No products have been listed yet.",
  subtitle,
  ctaLabel = "Sell Your First Item",
  ctaTo = "/sell",
  children,
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaTo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card-soft p-10 sm:p-14 text-center">
      <div className="mx-auto h-28 w-28 rounded-full gradient-brand flex items-center justify-center shadow-lg">
        <PackageOpen className="h-12 w-12 text-primary-foreground" />
      </div>
      <h2 className="mt-6 text-xl sm:text-2xl font-bold">{title}</h2>
      {subtitle && <p className="mt-2 text-muted-foreground text-sm max-w-md mx-auto">{subtitle}</p>}
      {children}
      <Link
        to={ctaTo}
        className="mt-6 inline-flex h-11 px-6 rounded-full gradient-orange text-orange-foreground text-sm font-semibold items-center shadow-md hover:scale-105 transition"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
