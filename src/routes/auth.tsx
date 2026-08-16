import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useStore, getProductionUrl } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Campus Mart" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { signIn, signUp, isProfileComplete } = useStore();

  function goAfterAuth(fallback: string) {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: fallback });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_RE.test(trimmedEmail)) return setError("Please enter a valid email address.");

    if (mode === "forgot") {
      setBusy(true);
      try {
        const redirectUrl = `${getProductionUrl()}/reset-password`;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: redirectUrl,
        });

        if (resetErr) console.warn("Supabase password reset notice:", resetErr);

        // Safe neutral message (prevents email enumeration)
        setInfo("If an account exists with this email address, a password recovery link has been sent. Please check your email inbox.");
      } catch (err: any) {
        setInfo("If an account exists with this email address, a password recovery link has been sent. Please check your email inbox.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) return setError("Please enter your full name.");
        if (password !== confirm) return setError("Passwords do not match.");
        const res = await signUp(name, trimmedEmail, password);
        if (!res.ok) return setError(res.error);

        if (res.isConfirmationRequired) {
          setInfo("Account created successfully! Please check your email inbox to confirm your account before logging in.");
        } else {
          setInfo("Account created! Redirecting to complete your profile...");
          setTimeout(() => goAfterAuth("/complete-profile"), 1000);
        }
      } else {
        const res = await signIn(trimmedEmail, password);
        if (!res.ok) {
          if (res.error.includes("Invalid login credentials")) {
            return setError("Invalid email or password. If you haven't confirmed your email yet, please check your inbox.");
          }
          return setError(res.error);
        }
        goAfterAuth(isProfileComplete ? "/dashboard" : "/complete-profile");
      }
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden gradient-brand text-primary-foreground p-12 flex-col justify-between">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-orange/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-card/10 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3">
          <img src={logo} alt="Campus Mart" width={44} height={44} className="h-11 w-11 rounded-lg bg-card p-1" />
          <div>
            <div className="font-display font-bold text-lg">Campus Mart</div>
            <div className="text-xs opacity-80 uppercase tracking-wider">Student Marketplace</div>
          </div>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">Your campus, your marketplace.</h2>
          <p className="mt-4 opacity-90 max-w-md">Create an account and start trading instantly — books, gear, cycles and more.</p>
        </div>
        <div className="relative text-xs opacity-70">© Campus Mart · Built for students</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
            <div className="font-display font-bold text-brand">Campus Mart</div>
          </Link>

          <h1 className="text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {mode === "signin"
              ? "Log in with your email and password to continue."
              : mode === "signup"
              ? "Sign up with your email to join the marketplace."
              : "Enter your email address and we'll send you a password recovery link."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <Field icon={User} label="Full Name" type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <Field icon={Mail} label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />

            {mode !== "forgot" && (
              <div className="relative">
                <Field icon={Lock} label={mode === "signup" ? "Create Password" : "Password"} type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[42px] text-muted-foreground hover:text-foreground" aria-label="Toggle password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            {mode === "signup" && (
              <Field icon={Lock} label="Confirm Password" type={showPw ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            )}

            {mode === "signin" && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setMode("forgot"); setError(null); setInfo(null); }} className="text-sm font-medium text-brand-2 hover:underline">
                  Forgot Password?
                </button>
              </div>
            )}

            {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}
            {info && <div className="text-sm text-brand-2 bg-brand-2/10 border border-brand-2/20 rounded-lg px-3 py-2">{info}</div>}

            <button type="submit" disabled={busy} className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-95 hover:scale-[1.01] transition shadow-lg disabled:opacity-70">
              {busy ? "Please wait…" : mode === "signin" ? "Login" : mode === "signup" ? "Create Account" : "Send Recovery Email"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "forgot" ? (
              <button type="button" onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="font-semibold text-brand-2 hover:underline">
                ← Back to Login
              </button>
            ) : (
              <>
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} className="font-semibold text-brand-2 hover:underline">
                  {mode === "signin" ? "Sign up" : "Login"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }: { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5 relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input {...props} className="w-full h-12 pl-10 pr-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition" />
      </div>
    </label>
  );
}
