import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Campus Mart" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase Auth link click
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      console.log("[Supabase Auth Event]:", event);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match. Please verify your entries.");
    }

    setBusy(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateErr) {
        console.error("Password update error:", updateErr);
        return setError(updateErr.message || "Failed to update password. Your reset link may have expired.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md card-soft p-8 sm:p-10 shadow-xl border border-border">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={logo} alt="Campus Mart" width={48} height={48} className="h-12 w-12 rounded-xl mb-3" />
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please enter your new password below to secure your Campus Mart account.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-lg">Password Reset Complete!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been updated successfully. You can now log in using your new password.
              </p>
            </div>
            <Link
              to="/auth"
              className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-md"
            >
              Go to Login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block">
                <span className="text-sm font-medium text-foreground">New Password</span>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-10 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition shrink-0"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                  </button>
                </div>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Confirm New Password</span>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition"
                />
              </div>
            </label>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg disabled:opacity-70 mt-2"
            >
              {busy ? "Updating…" : "Reset Password"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
