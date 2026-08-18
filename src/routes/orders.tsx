import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBag,
  Package,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { formatINR } from "@/lib/data";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders & Bookings — Campus Mart" }] }),
  component: () => (
    <RequireProfile>
      <MyOrdersPage />
    </RequireProfile>
  ),
});

function MyOrdersPage() {
  const { user } = useStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Dispute modal state
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState("Product not handed over");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  async function loadOrders() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from("orders")
        .select("*, products(id, name, price, image_url), profiles:seller_id(id, name, department, phone)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const { data: sData } = await supabase
        .from("orders")
        .select("*, products(id, name, price, image_url), profiles:buyer_id(id, name, department, phone)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setPurchases(pData ?? []);
      setSales(sData ?? []);
    } catch (e) {
      console.warn("Orders fetch notice:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [user]);

  async function handleMarkReady(order: any) {
    setUpdatingId(order.id);
    try {
      await supabase.from("orders").update({ status: "READY_FOR_PICKUP", ready_for_pickup: true }).eq("id", order.id);
      await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "order_placed",
        title: "Ready for Pickup! 📍",
        body: `The seller marked "${order.products?.name || "your item"}" as ready for campus pickup!`,
        action_url: "/orders",
      });
      await loadOrders();
    } catch (e: any) {
      alert("Error marking ready: " + (e?.message || "Please try again."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmHandover(order: any, isSeller: boolean) {
    const actionLabel = isSeller ? "confirm physical handover & payment is complete" : "confirm that you received the product";
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
        await supabase.from("products").update({ sold: true, booked: false, reserved: false }).eq("id", order.product_id);

        const otherUserId = isSeller ? order.buyer_id : order.seller_id;
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          type: "order_placed",
          title: "Transaction Completed! 🎉",
          body: `Handover for "${order.products?.name || "item"}" has been confirmed by both parties!`,
          action_url: "/orders",
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
    if (!window.confirm("Are you sure you want to cancel this booking? The product will be released back to the marketplace as AVAILABLE.")) return;
    setUpdatingId(order.id);
    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      await supabase.from("products").update({ sold: false, booked: false, reserved: false }).eq("id", order.product_id);

      const otherUserId = user?.id === order.seller_id ? order.buyer_id : order.seller_id;
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "order_placed",
        title: "Booking Cancelled",
        body: `The booking for "${order.products?.name || "item"}" was cancelled. The item is available again.`,
        action_url: "/orders",
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
    if (!disputeOrder || !user) return;
    setSubmittingDispute(true);
    try {
      const { analyzeAndResolveDispute } = await import("@/lib/ai-dispute-engine");
      const aiResult = await analyzeAndResolveDispute({
        order_id: disputeOrder.id,
        product_id: disputeOrder.product_id,
        opened_by: user.id,
        buyer_id: disputeOrder.buyer_id,
        seller_id: disputeOrder.seller_id,
        reason: disputeReason,
        description: disputeDesc,
      });

      const isAutoCancelled = aiResult.decision === "AUTO_CANCELLED";
      const isAutoCompleted = aiResult.decision === "AUTO_COMPLETED";

      const finalStatus = isAutoCancelled
        ? "RESOLVED_AUTO_CANCELLED"
        : isAutoCompleted
        ? "RESOLVED_AUTO_COMPLETED"
        : "NEEDS_ADMIN_REVIEW";

      const { data: createdDisp } = await supabase
        .from("disputes")
        .insert({
          order_id: disputeOrder.id,
          product_id: disputeOrder.product_id,
          opened_by: user.id,
          buyer_id: disputeOrder.buyer_id,
          seller_id: disputeOrder.seller_id,
          reason: disputeReason,
          description: disputeDesc,
          status: finalStatus,
          ai_decision: aiResult.decision,
          ai_classification: aiResult.classification,
          ai_confidence: aiResult.confidence,
          ai_reasoning: aiResult.reasoning,
          ai_recommended_action: aiResult.recommendedAction,
        })
        .select("id")
        .single();

      // Log AI decision
      await supabase.from("ai_decision_logs").insert({
        dispute_id: createdDisp?.id,
        order_id: disputeOrder.id,
        decision: aiResult.decision,
        classification: aiResult.classification,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        action_taken: isAutoCancelled
          ? "Auto-cancelled order and released item."
          : isAutoCompleted
          ? "Auto-completed order."
          : "Escalated to Admin Dashboard.",
      });

      if (isAutoCancelled) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", disputeOrder.id);
        await supabase.from("products").update({ sold: false, booked: false, reserved: false }).eq("id", disputeOrder.product_id);
        alert(`🤖 AI Resolution System (${aiResult.confidence}% confidence):\n\n${aiResult.reasoning}\n\nAction: Order cancelled and item released back to marketplace.`);
      } else if (isAutoCompleted) {
        await supabase.from("orders").update({ status: "completed" }).eq("id", disputeOrder.id);
        await supabase.from("products").update({ sold: true, booked: false, reserved: false }).eq("id", disputeOrder.product_id);
        alert(`🤖 AI Resolution System (${aiResult.confidence}% confidence):\n\n${aiResult.reasoning}\n\nAction: Order completed.`);
      } else {
        await supabase.from("orders").update({ status: "DISPUTED" }).eq("id", disputeOrder.id);
        alert(`🤖 AI Analysis (${aiResult.confidence}% confidence):\n\n${aiResult.reasoning}\n\nStatus: Marked "Needs Admin Review" for human administrator decision.`);
      }

      setDisputeOrder(null);
      setDisputeDesc("");
      await loadOrders();
    } catch (e: any) {
      alert("Error opening dispute: " + (e?.message || "Please try again."));
    } finally {
      setSubmittingDispute(false);
    }
  }

  const activeList = tab === "purchases" ? purchases : sales;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-brand" /> My Orders & Bookings
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Track your campus purchases, sales, handover confirmations, and booking cancellations.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setTab("purchases")}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              tab === "purchases"
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" /> My Purchases ({purchases.length})
          </button>
          <button
            onClick={() => setTab("sales")}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              tab === "sales"
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> My Sales & Handovers ({sales.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : activeList.length === 0 ? (
          <div className="card-soft p-12 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No orders found</p>
            <p className="text-sm mt-1">
              {tab === "purchases"
                ? "You haven't placed any bookings or orders yet. Explore the marketplace to find items!"
                : "No student has booked your listed items yet."}
            </p>
            {tab === "purchases" && (
              <div className="pt-4">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-full gradient-brand text-primary-foreground text-xs font-semibold shadow-md"
                >
                  Browse Marketplace
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((order) => {
              const isSeller = tab === "sales";
              const otherUser = order.profiles?.name || (isSeller ? "Buyer" : "Seller");
              const status = order.status;

              const isBooked = status === "pending_offline" || status === "BOOKED";
              const isReady = status === "READY_FOR_PICKUP";
              const isPendingHandover = status === "HANDOVER_PENDING";
              const isCompleted = status === "completed" || status === "paid";
              const isCancelled = status === "cancelled";
              const isDisputed = status === "DISPUTED";

              return (
                <div
                  key={order.id}
                  className="card-soft p-5 border border-border space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      {order.products?.image_url ? (
                        <img
                          src={
                            typeof order.products.image_url === "string" && order.products.image_url.startsWith("[")
                              ? JSON.parse(order.products.image_url)[0]
                              : order.products.image_url
                          }
                          alt=""
                          className="h-16 w-16 object-cover rounded-xl shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                          📦
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-base truncate">
                          {order.products?.name || "Campus Listing"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isSeller ? "Buyer" : "Seller"}: <span className="font-semibold text-foreground">{otherUser}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Date: {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold text-foreground">
                        {formatINR(order.products?.price ?? 0)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 justify-end flex-wrap">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isBooked ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            isReady ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                            isPendingHandover ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                            isCompleted ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            isDisputed ? "bg-orange/10 text-orange border border-orange/20" :
                            "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}
                        >
                          {isBooked ? "BOOKED" :
                           isReady ? "READY FOR PICKUP" :
                           isPendingHandover ? "HANDOVER PENDING" :
                           isCompleted ? "COMPLETED" :
                           isDisputed ? "DISPUTED" : "CANCELLED"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to="/chat"
                        search={{ id: order.id }}
                        className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-brand-2" /> Chat with {isSeller ? "Buyer" : "Seller"}
                      </Link>

                      {/* Cancel Order Option for active/booked orders */}
                      {!isCompleted && !isCancelled && !isDisputed && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          disabled={updatingId === order.id}
                          className="h-9 px-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white text-xs font-semibold transition disabled:opacity-50"
                        >
                          ✕ Cancel Order
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Seller Action: Ready for Pickup */}
                      {isSeller && isBooked && (
                        <button
                          onClick={() => handleMarkReady(order)}
                          disabled={updatingId === order.id}
                          className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50"
                        >
                          Mark Ready for Pickup
                        </button>
                      )}

                      {/* Handover Dual Confirmations */}
                      {!isCompleted && !isCancelled && !isDisputed && (
                        <button
                          onClick={() => handleConfirmHandover(order, isSeller)}
                          disabled={
                            updatingId === order.id ||
                            Boolean(isSeller ? order.seller_confirmed : order.buyer_confirmed)
                          }
                          className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                        >
                          {isSeller
                            ? order.seller_confirmed ? "✓ Handover Confirmed" : "Handover Completed"
                            : order.buyer_confirmed ? "✓ Received Confirmed" : "I Received the Product"}
                        </button>
                      )}

                      {/* Dispute / Problem Report */}
                      {!isCompleted && !isCancelled && !isDisputed && (
                        <button
                          onClick={() => setDisputeOrder(order)}
                          className="h-9 px-3 rounded-lg bg-orange/10 text-orange border border-orange/20 hover:bg-orange hover:text-white text-xs font-medium transition"
                        >
                          Report Problem
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
      </div>
    </AppShell>
  );
}
