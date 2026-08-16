import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";

export function RequireProfile({ children }: { children: ReactNode }) {
  const { isAuthenticated, isProfileComplete, loading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    if (!isAuthenticated) navigate({ to: "/auth" });
    else if (!isProfileComplete) navigate({ to: "/complete-profile" });
  }, [isAuthenticated, isProfileComplete, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAuthenticated || !isProfileComplete) return null;
  return <>{children}</>;
}
