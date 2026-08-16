import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, type Profile } from "@/lib/store";
import { Camera, Check, LogOut, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Campus Mart" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, saveProfile, signOut, isAuthenticated, userProducts, deleteProduct } = useStore();

  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(profile?.photo);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    department: profile?.department ?? "",
    year: profile?.year ?? "1st Year",
    phone: profile?.phone ?? "",
    residence: (profile?.residence ?? "Hostel") as Profile["residence"],
    bio: profile?.bio ?? "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) navigate({ to: "/auth" });
    else if (!profile) navigate({ to: "/complete-profile" });
  }, [isAuthenticated, profile, navigate]);

  useEffect(() => {
    if (profile) {
      setPhotoPreview(profile.photo);
      setForm({
        name: profile.name,
        department: profile.department,
        year: profile.year,
        phone: profile.phone,
        residence: profile.residence,
        bio: profile.bio,
      });
    }
  }, [profile]);

  if (!user || !profile) return null;

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
    if (!user) return;
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Your Profile</h1>
            <p className="mt-1 text-muted-foreground text-sm">Update your details so other students can recognise you.</p>
          </div>
          <button
            onClick={() => { signOut(); navigate({ to: "/auth" }); }}
            className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <form onSubmit={submit} className="mt-8 card-soft p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  form.name.trim().split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted cursor-pointer">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-lg truncate">{form.name || "Your name"}</div>
              <div className="text-sm text-muted-foreground truncate">{form.department} · {form.year}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Phone Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Select
              label="Year"
              value={form.year}
              onChange={(v) => setForm({ ...form, year: v })}
              options={["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Postgraduate"]}
            />
            <Select
              label="Hostel / Day Scholar"
              value={form.residence}
              onChange={(v) => setForm({ ...form, residence: v as Profile["residence"] })}
              options={["Hostel", "Day Scholar"]}
            />
            <label className="block">
              <span className="text-sm font-medium">College Email</span>
              <input
                readOnly
                value={user.email}
                className="mt-1.5 w-full h-11 px-3 rounded-xl bg-muted border border-border text-muted-foreground outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="mt-1.5 w-full px-3 py-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition"
            />
          </label>

          <button
            type="submit"
            className="h-11 px-6 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-95 transition shadow-md"
          >
            {saved ? (<><Check className="h-4 w-4" /> Saved</>) : "Save Changes"}
          </button>
        </form>

        {/* My Posted Listings Section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">My Posted Listings ({userProducts.length})</h2>
          {userProducts.length === 0 ? (
            <div className="card-soft p-6 text-center text-muted-foreground text-sm">
              You haven't posted any listings yet.
            </div>
          ) : (
            <div className="space-y-3">
              {userProducts.map((prod) => (
                <div key={prod.id} className="card-soft p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="h-14 w-14 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{prod.name}</div>
                      <div className="text-xs text-muted-foreground">{prod.category} · {prod.condition}</div>
                      <div className="text-sm font-bold text-foreground">₹{prod.price}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate({ to: "/product/$id", params: { id: prod.id } })}
                      className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                          await deleteProduct(prod.id);
                        }
                      }}
                      className="h-9 px-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
