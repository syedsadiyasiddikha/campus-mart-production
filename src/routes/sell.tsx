import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { CATEGORIES, type Product } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Upload, Check, Camera, X, Plus } from "lucide-react";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Sell an Item — Campus Mart" }] }),
  component: () => <RequireProfile><Sell /></RequireProfile>,
});

export function Sell() {
  const { addProduct } = useStore();
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: CATEGORIES[0].name,
    price: "",
    description: "",
    condition: "Good" as Product["condition"],
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFilesAdded(newFiles: FileList | File[]) {
    const fileArray = Array.from(newFiles);
    if (fileArray.length === 0) return;

    const updatedFiles = [...files, ...fileArray];
    setFiles(updatedFiles);

    const newPreviews: string[] = [];
    fileArray.forEach((f) => {
      newPreviews.push(URL.createObjectURL(f));
    });
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function startCamera() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please make sure camera permissions are allowed.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      handleFilesAdded([file]);
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const time = new Date().toISOString();
    console.log(`[DIAGNOSTIC] Form Submit Event Fired | SubID: ${subId} | Time: ${time}`);

    if (busy) {
      console.log(`[DIAGNOSTIC] Form Submit Blocked (Busy = true) | SubID: ${subId}`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await addProduct({
        name: form.name,
        price: Number(form.price) || 0,
        category: form.category,
        condition: form.condition,
        description: form.description,
        imageFiles: files,
      });
      console.log(`[DIAGNOSTIC] addProduct Result | SubID: ${subId} | OK: ${res.ok}`);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/product/$id", params: { id: res.product.id } }), 900);
    } catch (err: any) {
      console.error(`[DIAGNOSTIC] Form Submit Error | SubID: ${subId}`, err);
      setError(err?.message ?? "An error occurred while uploading. Please try again.");
    } finally {
      setBusy(false);
    }
  }



  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Sell an Item</h1>
        <p className="mt-1 text-muted-foreground text-sm">List your item with multiple photos or live camera capture. It'll appear on the Marketplace instantly.</p>

        <form onSubmit={submit} className="mt-8 card-soft p-6 sm:p-8 space-y-5">
          {/* Images / Camera Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Product Photos ({previews.length})</span>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-brand flex items-center gap-1.5 hover:opacity-90 transition"
              >
                <Camera className="h-3.5 w-3.5" />
                {cameraActive ? "Close Camera" : "Take Photo"}
              </button>
            </div>

            {/* Live Camera View */}
            {cameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4 flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 flex gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-5 py-2.5 rounded-full gradient-brand text-primary-foreground font-semibold text-sm shadow-lg hover:scale-105 transition"
                  >
                    Snap Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-full bg-card/80 text-foreground font-medium text-sm hover:bg-card transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-muted">
                  <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-90 hover:bg-destructive transition"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              <label className="relative aspect-square rounded-xl border-2 border-dashed border-border hover:border-brand-2 transition bg-muted/30 flex flex-col items-center justify-center cursor-pointer p-2 text-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
                <span className="mt-1 text-xs text-muted-foreground font-medium">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <Input label="Product Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Scientific Calculator FX-991EX" />

          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map((c) => c.name)} />
            <Input label="Price (₹)" type="number" required value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="350" />
          </div>

          <Select label="Condition" value={form.condition} onChange={(v) => setForm({ ...form, condition: v as Product["condition"] })} options={["Like New", "Good", "Fair"]} />

          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Add useful details — usage time, condition notes, pickup location..." className="mt-1.5 w-full px-3 py-3 rounded-xl bg-card border border-border focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 outline-none transition" />
          </label>

          {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

          <button type="submit" disabled={busy || done} className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-semibold hover:opacity-95 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
            {done ? (<><Check className="h-5 w-5" /> Posted! Redirecting…</>) : busy ? "Uploading Photos & Posting…" : "Post Listing"}
          </button>
        </form>
      </div>
    </AppShell>
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
