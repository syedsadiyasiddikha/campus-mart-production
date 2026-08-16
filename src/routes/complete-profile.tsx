import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { useStore, type Profile } from "@/lib/store";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({ meta: [{ title: "Complete Your Profile — Campus Mart" }] }),
  component: CompleteProfile,
});

function CompleteProfile() {
  const { user, profile, saveProfile, isAuthenticated, loading } = useStore();
  const navigate = useNavigate();
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(profile?.photo);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    department: profile?.department ?? "",
    year: profile?.year ?? "1st Year",
    phone: profile?.phone ?? "",
    residence: (profile?.residence ?? "Hostel") as Profile["residence"],
    bio: profile?.bio ?? "",
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/auth" });
  }, [isAuthenticated, loading, navigate]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveProfile({
        photo: photoPreview,
        photoFile,
        name: form.name.trim(),
        email: user.email,
        department: form.department.trim(),
        year: form.year,
        phone: form.phone.trim(),
        residence: form.residence,
        bio: form.bio.trim(),
      });
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center gap-2">
          <img src={logo} alt="Campus Mart" className="h-9 w-9" />
          <div className="font-display font-bold text-brand">Campus Mart</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold">Complete Your Profile</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Add your details to start buying and selling on Campus Mart.
        </p>

        <form onSubmit={submit} className="mt-8 card-soft p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center text-3xl font-bold text-muted-foreground">
                {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : (form.name.trim()[0]?.toUpperCase() ?? "?")}
              </div>
              <label className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted cursor-pointer">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
            </div>
            <div className="text-sm text-muted-foreground">Upload a clear profile photo so other students can recognise you.</div>
          </div>

          <Input label="Full Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Your full name" />

          <label className="block">
            <span className="text-sm font-medium">Email Address</span>
            <input readOnly value={user?.email ?? ""} className="mt-1.5 w-full h-11 px-3 rounded-xl bg-muted border border-border text-muted-foreground outline-none" />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Department" required value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="e.g. Computer Science" />
            <Select label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} options={["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Postgraduate"]} />
            <Input label="Phone Number" required type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 9xxxxxxxxx" />
            <Select label="Hostel / Day Scholar" value={form.residence} onChange={(v) => setForm({ ...form, residence: v as Profile["residence"] })} options={["Hostel", "Day Scholar"]} />
          </div>

          <label className="block">
            <span className="text-sm font-medium">Bio</span>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Tell other students a bit about yourself..." className="mt-1.5 w-full px-3 py-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition" />
          </label>

          <button type="submit" disabled={busy} className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-semibold hover:opacity-95 transition shadow-lg disabled:opacity-70">
            {busy ? "Saving…" : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...props }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input {...props} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
