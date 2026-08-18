import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";

export function RequireProfile({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile, loading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/auth" });
    } else if (profile && !profile.name) {
      navigate({ to: "/complete-profile" });
    }
  }, [isAuthenticated, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-medium text-muted-foreground">
        Loading Campus Mart…
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
