import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Heart, Home, MessageCircle, Plus, Search, User, Menu, X, MapPin, ShoppingBag, HelpCircle, Mail, ShieldCheck, Package } from "lucide-react";
import { useState, type ReactNode } from "react";
import logo from "@/assets/logo.jpg";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";


const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/orders", label: "My Orders", icon: Package },
  { to: "/sell", label: "Sell", icon: Plus },
  { to: "/request", label: "Requests", icon: HelpCircle },
  { to: "/lost-found", label: "Lost & Found", icon: MapPin },
  { to: "/chat", label: "Chat", icon: MessageCircle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, isAuthenticated } = useStore();
  const isAdmin = checkIsAdmin(user, profile);

  const visibleNav = NAV.filter((n) => {
    if (!isAuthenticated && (n.to === "/marketplace" || n.to === "/orders")) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <img src={logo} alt="Campus Mart" width={36} height={36} className="h-9 w-9" />
              <div className="hidden sm:block leading-tight">
                <div className="font-display font-bold text-base text-brand">Campus Mart</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Student Marketplace</div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {visibleNav.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "text-brand bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === "/admin" ? "bg-orange text-white" : "text-orange hover:bg-orange/10"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
            </nav>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="lg:hidden p-2 rounded-full text-orange hover:bg-orange/10 transition"
                  aria-label="Admin Dashboard"
                  title="Admin Dashboard"
                >
                  <ShieldCheck className="h-5 w-5" />
                </Link>
              )}
              <Link to="/wishlist" className="p-2 rounded-full hover:bg-muted transition" aria-label="Wishlist">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </Link>
              <Link to="/notifications" className="p-2 rounded-full hover:bg-muted transition" aria-label="Notifications">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Link>
              <Link to="/profile" className="p-1 rounded-full hover:bg-muted transition" aria-label="Profile">
                <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              </Link>
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-muted"
                onClick={() => setOpen(!open)}
                aria-label="Menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="lg:hidden pb-3 grid grid-cols-2 gap-1 animate-in fade-in">
              {visibleNav.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Campus Mart" width={32} height={32} className="h-8 w-8" />
            <div className="font-display font-bold text-brand">Campus Mart</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            The trusted student marketplace to buy, sell and discover within your campus.
          </p>
        </div>
        <FooterCol title="About">
          <a href="#">About Campus Mart</a>
          <a href="#">Careers</a>
          <a href="#">Press</a>
        </FooterCol>
        <FooterCol title="Support">
          <a href="#">Contact</a>
          <a href="#">Help Center</a>
          <a href="#">Safety Tips</a>
        </FooterCol>
        <FooterCol title="Legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Community Guidelines</a>
        </FooterCol>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Campus Mart. Made for students.</div>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Email" className="hover:text-foreground"><Mail className="h-4 w-4" /></a>
            <a href="#" className="hover:text-foreground">Instagram</a>
            <a href="#" className="hover:text-foreground">Twitter</a>
            <a href="#" className="hover:text-foreground">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground [&_a]:hover:text-foreground [&_a]:transition-colors">
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search books, calculators, cycles…" }: { value?: string; onChange?: (v: string) => void; placeholder?: string }) {
  const [internalVal, setInternalVal] = useState(value ?? "");
  const [focused, setFocused] = useState(false);
  const { allProducts } = useStore();
  const navigate = useNavigate();

  const query = (value !== undefined ? value : internalVal).trim().toLowerCase();

  const suggestions = query.length >= 1
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.seller.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  function handleSelect(productId: string) {
    setFocused(false);
    navigate({ to: "/product/$id", params: { id: productId } });
  }

  return (
    <div className="relative z-30">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={value !== undefined ? value : internalVal}
          onChange={(e) => {
            setInternalVal(e.target.value);
            onChange?.(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="w-full h-12 pl-11 pr-10 rounded-full bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none text-sm transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => {
              setInternalVal("");
              onChange?.("");
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden py-2 divide-y divide-border/50 animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Search Suggestions ({suggestions.length})
          </div>
          {suggestions.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => handleSelect(p.id)}
              className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-muted/70 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="h-10 w-10 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-xs">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category} · {p.seller}</div>
                </div>
              </div>
              <div className="font-bold text-sm text-brand-2 shrink-0">₹{p.price}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { Button };

