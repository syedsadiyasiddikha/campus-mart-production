import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Tag, Truck, Leaf, ArrowRight, Sparkles } from "lucide-react";
import logo from "@/assets/logo.jpg";
import hero from "@/assets/hero.jpg";
import { SiteFooter } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Mart — Buy, Sell & Save Within Your Campus" },
      { name: "description", content: "The trusted student marketplace for pre-owned books, calculators, cycles and hostel essentials." },
      { property: "og:title", content: "Campus Mart — Student Marketplace" },
      { property: "og:description", content: "Buy, sell and save within your campus." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Shield, title: "Secure Student Marketplace", desc: "Verified college emails only. Chat and trade with students you can trust." },
  { icon: Tag, title: "Affordable Prices", desc: "Pay a fraction of retail. Find books, calculators and gear at student-friendly prices." },
  { icon: Truck, title: "Quick Campus Pickup", desc: "Buyer and seller on the same campus. No shipping wait, no delivery fees." },
  { icon: Leaf, title: "Eco-Friendly Reuse", desc: "Give your textbooks a second life. Reuse, reduce waste, save money." },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Campus Mart" width={40} height={40} className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-display font-bold text-brand">Campus Mart</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Student Marketplace</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition hidden sm:block">
              Marketplace
            </Link>
            <Link to="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition hidden sm:block">
              My Orders
            </Link>
            <Link to="/admin" className="text-sm font-medium text-orange hover:text-orange/80 transition hidden sm:block">
              Admin
            </Link>
            <Link to="/auth" className="text-sm font-medium text-foreground hover:text-brand transition px-3 py-2">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="text-sm font-semibold gradient-brand text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-background to-background" />
          <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-brand-2/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-orange/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-orange" />
              Trusted by students across India
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Buy, Sell & Save{" "}
              <span className="text-gradient-brand">Within Your Campus</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              From engineering textbooks to bicycles, find everything you need from fellow students — at prices you can actually afford.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full gradient-brand text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-card border border-border text-foreground font-semibold hover:bg-muted transition"
              >
                Browse Marketplace
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm">
              <div><span className="font-bold text-foreground">12K+</span> <span className="text-muted-foreground">Students</span></div>
              <div className="h-4 w-px bg-border" />
              <div><span className="font-bold text-foreground">8K+</span> <span className="text-muted-foreground">Listings</span></div>
              <div className="h-4 w-px bg-border" />
              <div><span className="font-bold text-foreground">150+</span> <span className="text-muted-foreground">Campuses</span></div>
            </div>
          </div>

          <div className="relative animate-float-slow">
            <div className="absolute -inset-4 gradient-brand opacity-20 blur-2xl rounded-3xl" />
            <img
              src={hero}
              alt="Students at a campus marketplace"
              width={1600}
              height={1000}
              className="relative rounded-3xl shadow-2xl object-cover aspect-[4/3] w-full"
            />
            <div className="absolute -bottom-6 -left-6 card-soft p-4 hidden sm:flex items-center gap-3 bg-card">
              <div className="h-10 w-10 rounded-full gradient-orange flex items-center justify-center text-orange-foreground font-bold">₹</div>
              <div>
                <div className="text-xs text-muted-foreground">Average savings</div>
                <div className="font-bold">Up to 70% off</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold">Why students choose Campus Mart</h2>
            <p className="mt-3 text-muted-foreground">A marketplace built around campus life — safe, fast, and refreshingly affordable.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-soft p-6 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300">
                  <div className="h-12 w-12 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground shadow-md">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-semibold text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl gradient-brand p-10 sm:p-14 text-center text-primary-foreground shadow-2xl">
            <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full bg-orange/30 blur-3xl" />
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to declutter or save?</h2>
            <p className="mt-3 opacity-90 max-w-xl mx-auto">Join thousands of students already trading on Campus Mart.</p>
            <Link
              to="/auth"
              className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-card text-brand font-semibold hover:scale-105 transition"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
