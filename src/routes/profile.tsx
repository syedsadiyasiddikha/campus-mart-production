import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, checkIsAdmin, type Profile } from "@/lib/store";
import { Camera, Check, LogOut, Trash2, ExternalLink, ShieldCheck } from "lucide-react";

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Your Profile</h1>
            <p className="mt-1 text-muted-foreground text-sm">Update your details so other students can recognise you.</p>
          </div>
          <div className="flex items-center gap-2">
            {checkIsAdmin(user, profile) && (
              <button
                onClick={() => navigate({ to: "/admin" })}
                className="h-10 px-4 rounded-lg bg-orange text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition"
              >
                <ShieldCheck className="h-4 w-4" /> Admin Dashboard
              </button>
            )}
            <button
              onClick={() => { signOut(); navigate({ to: "/auth" }); }}
              className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
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

        {/* My Orders & Sales Section */}
        <OrdersAndSalesSection userId={user.id} />

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

function OrdersAndSalesSection({ userId }: { userId: string }) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Dispute modal state
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState("Product not handed over");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Report user modal state
  const [reportUserTarget, setReportUserTarget] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState("Harassment or inappropriate behavior");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  async function loadOrders() {
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from("orders")
        .select("*, products(name, price, image_url), profiles:seller_id(name)")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });

      const { data: sData } = await supabase
        .from("orders")
        .select("*, products(name, price, image_url), profiles:buyer_id(name)")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });

      setPurchases(pData ?? []);
      setSales(sData ?? []);
    } catch (e) {
      console.warn("Error fetching orders:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [userId]);

  async function handleMarkReady(order: any) {
    setUpdatingId(order.id);
    try {
      await supabase.from("orders").update({ status: "READY_FOR_PICKUP", ready_for_pickup: true }).eq("id", order.id);
      await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "order_placed",
        title: "Ready for Pickup! 📍",
        body: `The seller marked "${order.products?.name || "your item"}" as ready for campus pickup!`,
        action_url: "/profile",
      });
      await loadOrders();
    } catch (e: any) {
      alert("Error marking ready: " + (e?.message || "Please try again."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmHandover(order: any, isSeller: boolean) {
    const actionLabel = isSeller ? "confirm that physical handover & payment is complete" : "confirm that you received the product";
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    setUpdatingId(order.id);
    try {
      const buyerConf = isSeller ? Boolean(order.buyer_confirmed) : true;
      const sellerConf = isSeller ? true : Boolean(order.seller_confirmed);
      const isBothConfirmed = buyerConf && sellerConf;

      const updateData: any = {
        buyer_confirmed: buyerConf,
        seller_confirmed: sellerConf,
        status: isBothConfirmed ? "completed" : "HANDOVER_PENDING",
      };

      await supabase.from("orders").update(updateData).eq("id", order.id);

      if (isBothConfirmed) {
        // Only mark SOLD OUT when BOTH parties confirm!
        await supabase.from("products").update({ sold: true, booked: false, reserved: false }).eq("id", order.product_id);

        const otherUserId = isSeller ? order.buyer_id : order.seller_id;
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          type: "order_placed",
          title: "Transaction Completed! 🎉",
          body: `Handover for "${order.products?.name || "item"}" has been confirmed by both parties!`,
          action_url: "/profile",
        });
      } else {
        const otherUserId = isSeller ? order.buyer_id : order.seller_id;
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          type: "order_placed",
          title: "Handover Confirmation Pending ⏳",
          body: `${isSeller ? "Seller" : "Buyer"} confirmed handover for "${order.products?.name || "item"}". Please confirm on your orders tab to complete.`,
          action_url: "/profile",
        });
      }

      await loadOrders();
    } catch (e: any) {
      alert("Error confirming handover: " + (e?.message || "Please try again."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancelOrder(order: any) {
    if (!window.confirm("Are you sure you want to cancel this booking? The item will be made available to other buyers.")) return;
    setUpdatingId(order.id);
    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      await supabase.from("products").update({ sold: false, booked: false, reserved: false }).eq("id", order.product_id);

      const otherUserId = userId === order.seller_id ? order.buyer_id : order.seller_id;
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "order_placed",
        title: "Booking Cancelled",
        body: `The booking for "${order.products?.name || "item"}" was cancelled. The item is available again.`,
        action_url: "/profile",
      });

      await loadOrders();
    } catch (e: any) {
      alert("Error cancelling booking: " + (e?.message || "Please try again."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function submitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeOrder) return;
    setSubmittingDispute(true);
    try {
      // 1. Insert into disputes table
      await supabase.from("disputes").insert({
        order_id: disputeOrder.id,
        product_id: disputeOrder.product_id,
        opened_by: userId,
        buyer_id: disputeOrder.buyer_id,
        seller_id: disputeOrder.seller_id,
        reason: disputeReason,
        description: disputeDesc,
      });

      // 2. Mark order as DISPUTED (product remains booked, NOT sold out)
      await supabase.from("orders").update({ status: "DISPUTED" }).eq("id", disputeOrder.id);

      const otherUserId = userId === disputeOrder.seller_id ? disputeOrder.buyer_id : disputeOrder.seller_id;
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "order_placed",
        title: "Dispute Opened ⚠️",
        body: `A problem/dispute was reported for "${disputeOrder.products?.name || "order"}". Status: Under Review.`,
        action_url: "/profile",
      });

      alert("Dispute reported. The order has been marked as DISPUTED and chat history is retained for review.");
      setDisputeOrder(null);
      setDisputeDesc("");
      await loadOrders();
    } catch (e: any) {
      alert("Error opening dispute: " + (e?.message || "Please try again."));
    } finally {
      setSubmittingDispute(false);
    }
  }

  async function submitUserReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportUserTarget) return;
    setSubmittingReport(true);
    try {
      await supabase.from("user_reports").insert({
        reported_by: userId,
        reported_user_id: reportUserTarget.id,
        reason: reportReason,
        details: reportDetails,
      });
      alert(`Report submitted against ${reportUserTarget.name}. Our moderation team will inspect the chat and activity history.`);
      setReportUserTarget(null);
      setReportDetails("");
    } catch (e: any) {
      alert("Error submitting report: " + (e?.message || "Please try again."));
    } finally {
      setSubmittingReport(false);
    }
  }

  if (loading) return null;
  if (purchases.length === 0 && sales.length === 0) return null;

  return (
    <div className="mt-10 space-y-8">
      {/* My Sales (Incoming Orders for Seller) */}
      {sales.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Incoming Sales & Handovers ({sales.length})</h2>
          <div className="space-y-3">
            {sales.map((order) => {
              const status = order.status;
              const isBooked = status === "pending_offline" || status === "BOOKED";
              const isReady = status === "READY_FOR_PICKUP";
              const isPendingHandover = status === "HANDOVER_PENDING";
              const isCompleted = status === "completed" || status === "paid";
              const isCancelled = status === "cancelled";
              const isDisputed = status === "DISPUTED";

              const buyerName = order.profiles?.name || "Buyer";

              return (
                <div key={order.id} className="card-soft p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap border border-border">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{order.products?.name || "Campus Item"}</div>
                    <div className="text-xs text-muted-foreground">Buyer: {buyerName}</div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isBooked ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        isReady ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                        isPendingHandover ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                        isCompleted ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                        isDisputed ? "bg-orange/10 text-orange border border-orange/20" :
                        "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}>
                        {isBooked ? "BOOKED" :
                         isReady ? "READY FOR PICKUP" :
                         isPendingHandover ? "HANDOVER PENDING" :
                         isCompleted ? "COMPLETED (Sold Out)" :
                         isDisputed ? "DISPUTED" : "CANCELLED"}
                      </span>
                      {order.seller_confirmed && !isCompleted && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md font-medium">✓ You Confirmed</span>
                      )}
                      {order.buyer_confirmed && !isCompleted && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md font-medium">✓ Buyer Confirmed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Seller Action: Ready for Pickup */}
                    {isBooked && (
                      <button
                        onClick={() => handleMarkReady(order)}
                        disabled={updatingId === order.id}
                        className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        Mark Ready for Pickup
                      </button>
                    )}

                    {/* Seller Action: Handover Completed */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => handleConfirmHandover(order, true)}
                        disabled={updatingId === order.id || Boolean(order.seller_confirmed)}
                        className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        {order.seller_confirmed ? "✓ Handover Confirmed" : "Handover Completed"}
                      </button>
                    )}

                    {/* Cancel Action */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={updatingId === order.id}
                        className="h-9 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Dispute Action */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => setDisputeOrder(order)}
                        className="h-9 px-3 rounded-lg bg-orange/10 text-orange border border-orange/20 hover:bg-orange hover:text-white text-xs font-medium transition"
                      >
                        Report Problem
                      </button>
                    )}

                    {/* Report User Action */}
                    <button
                      onClick={() => setReportUserTarget({ id: order.buyer_id, name: buyerName })}
                      className="h-9 px-2.5 rounded-lg text-muted-foreground hover:text-destructive text-xs font-medium transition"
                      title="Report Buyer"
                    >
                      Report User
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Purchases (Buyer Orders) */}
      {purchases.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">My Order & Booking History ({purchases.length})</h2>
          <div className="space-y-3">
            {purchases.map((order) => {
              const status = order.status;
              const isBooked = status === "pending_offline" || status === "BOOKED";
              const isReady = status === "READY_FOR_PICKUP";
              const isPendingHandover = status === "HANDOVER_PENDING";
              const isCompleted = status === "completed" || status === "paid";
              const isCancelled = status === "cancelled";
              const isDisputed = status === "DISPUTED";

              const sellerName = order.profiles?.name || "Seller";

              return (
                <div key={order.id} className="card-soft p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap border border-border">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{order.products?.name || "Campus Item"}</div>
                    <div className="text-xs text-muted-foreground">Seller: {sellerName} · Booking Date: {new Date(order.created_at).toLocaleDateString()}</div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isBooked ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        isReady ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                        isPendingHandover ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                        isCompleted ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                        isDisputed ? "bg-orange/10 text-orange border border-orange/20" :
                        "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}>
                        {isBooked ? "BOOKED" :
                         isReady ? "READY FOR PICKUP" :
                         isPendingHandover ? "HANDOVER PENDING" :
                         isCompleted ? "COMPLETED" :
                         isDisputed ? "DISPUTED" : "CANCELLED"}
                      </span>
                      {order.buyer_confirmed && !isCompleted && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md font-medium">✓ You Confirmed</span>
                      )}
                      {order.seller_confirmed && !isCompleted && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md font-medium">✓ Seller Confirmed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Buyer Action: I Received the Product */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => handleConfirmHandover(order, false)}
                        disabled={updatingId === order.id || Boolean(order.buyer_confirmed)}
                        className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        {order.buyer_confirmed ? "✓ Received Confirmed" : "I Received the Product"}
                      </button>
                    )}

                    {/* Cancel Action */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={updatingId === order.id}
                        className="h-9 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border transition disabled:opacity-50"
                      >
                        Cancel Booking
                      </button>
                    )}

                    {/* Dispute Action */}
                    {!isCompleted && !isCancelled && !isDisputed && (
                      <button
                        onClick={() => setDisputeOrder(order)}
                        className="h-9 px-3 rounded-lg bg-orange/10 text-orange border border-orange/20 hover:bg-orange hover:text-white text-xs font-medium transition"
                      >
                        Report Problem
                      </button>
                    )}

                    {/* Report User Action */}
                    <button
                      onClick={() => setReportUserTarget({ id: order.seller_id, name: sellerName })}
                      className="h-9 px-2.5 rounded-lg text-muted-foreground hover:text-destructive text-xs font-medium transition"
                      title="Report Seller"
                    >
                      Report User
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-soft w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold">Report a Problem / Open Dispute</h3>
            <p className="text-xs text-muted-foreground">
              Item: <span className="font-semibold text-foreground">{disputeOrder.products?.name || "Order Item"}</span>
            </p>

            <form onSubmit={submitDispute} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Reason for Dispute</span>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border text-sm outline-none focus:border-brand-2"
                >
                  <option value="Product not handed over">Product not handed over</option>
                  <option value="Seller did not show up">Seller did not show up</option>
                  <option value="Buyer did not show up">Buyer did not show up</option>
                  <option value="Product different from listing">Product different from listing</option>
                  <option value="Payment/transaction problem">Payment/transaction problem</option>
                  <option value="Harassment or inappropriate behavior">Harassment or inappropriate behavior</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Additional Details / Evidence</span>
                <textarea
                  rows={3}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Describe what happened during campus handover..."
                  className="mt-1.5 w-full px-3 py-2 rounded-xl bg-card border border-border text-sm outline-none focus:border-brand-2"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeOrder(null)}
                  className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="h-10 px-5 rounded-xl bg-orange text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submittingDispute ? "Submitting…" : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT USER MODAL */}
      {reportUserTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-soft w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold">Report User</h3>
            <p className="text-xs text-muted-foreground">
              Reporting: <span className="font-semibold text-foreground">{reportUserTarget.name}</span>
            </p>

            <form onSubmit={submitUserReport} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Reason</span>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl bg-card border border-border text-sm outline-none focus:border-brand-2"
                >
                  <option value="Harassment or inappropriate behavior">Harassment or inappropriate behavior</option>
                  <option value="Spam or fraudulent activity">Spam or fraudulent activity</option>
                  <option value="No-show during handover">No-show during handover</option>
                  <option value="Fake or misleading listings">Fake or misleading listings</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Details</span>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context or details about the issue..."
                  className="mt-1.5 w-full px-3 py-2 rounded-xl bg-card border border-border text-sm outline-none focus:border-brand-2"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportUserTarget(null)}
                  className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="h-10 px-5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submittingReport ? "Reporting…" : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
