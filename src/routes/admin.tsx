import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  History,
  ShieldAlert,
  Search,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin & Dispute Dashboard — Campus Mart" }] }),
  component: () => (
    <RequireProfile>
      <AdminDashboard />
    </RequireProfile>
  ),
});

function AdminDashboard() {
  const { user, profile } = useStore();
  const navigate = useNavigate();

  const isAdmin =
    profile?.role === "admin" ||
    (user?.email && user.email.toLowerCase().includes("admin"));

  const [tab, setTab] = useState<"disputes" | "reports" | "audit">("disputes");

  const [disputes, setDisputes] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filter state
  const [disputeFilter, setDisputeFilter] = useState<string>("ALL");

  async function loadAdminData() {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Disputes with Joined Details
      const { data: disputesData } = await supabase
        .from("disputes")
        .select("*, orders(status), products(name, price, image_url)")
        .order("created_at", { ascending: false });

      if (disputesData && disputesData.length > 0) {
        const userIds = Array.from(
          new Set(
            disputesData.flatMap((d: any) => [d.buyer_id, d.seller_id, d.opened_by])
          )
        );
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name, department, phone")
          .in("id", userIds);
        const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

        const enrichedDisputes = disputesData.map((d: any) => ({
          ...d,
          buyer: profMap.get(d.buyer_id),
          seller: profMap.get(d.seller_id),
          opener: profMap.get(d.opened_by),
        }));
        setDisputes(enrichedDisputes);
      } else {
        setDisputes([]);
      }

      // 2. Fetch User Reports
      const { data: reportsData } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsData && reportsData.length > 0) {
        const userIds = Array.from(
          new Set(
            reportsData.flatMap((r: any) => [r.reported_by, r.reported_user_id])
          )
        );
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name, department, suspended")
          .in("id", userIds);
        const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

        const enrichedReports = reportsData.map((r: any) => ({
          ...r,
          reporter: profMap.get(r.reported_by),
          reported: profMap.get(r.reported_user_id),
        }));
        setReports(enrichedReports);
      } else {
        setReports([]);
      }

      // 3. Fetch Audit Logs
      const { data: logsData } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setAuditLogs(logsData ?? []);
    } catch (e) {
      console.warn("Admin data loading notice:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [user, profile]);

  async function logAudit(action: string, targetType: string, targetId?: string, details?: string) {
    try {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      });
    } catch (e) {
      console.warn("Audit logging notice:", e);
    }
  }

  // DISPUTE ACTIONS
  async function resolveCompleteDispute(dispute: any) {
    if (!window.confirm(`Are you sure you want to resolve this dispute and mark the transaction as COMPLETED (Sold Out)?`)) return;
    setBusyId(dispute.id);
    try {
      // Mark order completed & product sold
      await supabase.from("orders").update({ status: "completed" }).eq("id", dispute.order_id);
      await supabase.from("products").update({ sold: true, booked: false, reserved: false }).eq("id", dispute.product_id);
      await supabase.from("disputes").update({ status: "RESOLVED_COMPLETED" }).eq("id", dispute.id);

      // Audit Log
      await logAudit("RESOLVE_DISPUTE_COMPLETED", "dispute", dispute.id, `Resolved dispute for order ${dispute.order_id}. Transaction marked completed.`);

      // Notify buyer & seller
      await supabase.from("notifications").insert([
        {
          user_id: dispute.buyer_id,
          type: "order_placed",
          title: "Dispute Resolved — Transaction Completed",
          body: `Admin reviewed and resolved the dispute for "${dispute.products?.name || "your order"}". Status: Completed.`,
          action_url: "/profile",
        },
        {
          user_id: dispute.seller_id,
          type: "order_placed",
          title: "Dispute Resolved — Transaction Completed",
          body: `Admin reviewed and resolved the dispute for "${dispute.products?.name || "your order"}". Status: Completed.`,
          action_url: "/profile",
        },
      ]);

      await loadAdminData();
    } catch (e: any) {
      alert("Error resolving dispute: " + (e?.message || "Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function resolveCancelDispute(dispute: any) {
    if (!window.confirm(`Are you sure you want to cancel this transaction and release the item back to AVAILABLE status?`)) return;
    setBusyId(dispute.id);
    try {
      // Mark order cancelled & product available
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", dispute.order_id);
      await supabase.from("products").update({ sold: false, booked: false, reserved: false }).eq("id", dispute.product_id);
      await supabase.from("disputes").update({ status: "RESOLVED_CANCELLED" }).eq("id", dispute.id);

      // Audit Log
      await logAudit("RESOLVE_DISPUTE_CANCELLED", "dispute", dispute.id, `Cancelled transaction for order ${dispute.order_id}. Product released to available.`);

      // Notify buyer & seller
      await supabase.from("notifications").insert([
        {
          user_id: dispute.buyer_id,
          type: "order_placed",
          title: "Dispute Resolved — Transaction Cancelled",
          body: `Admin cancelled the transaction for "${dispute.products?.name || "order"}". The item has been made available again.`,
          action_url: "/profile",
        },
        {
          user_id: dispute.seller_id,
          type: "order_placed",
          title: "Dispute Resolved — Transaction Cancelled",
          body: `Admin cancelled the transaction for "${dispute.products?.name || "order"}". The item has been made available again.`,
          action_url: "/profile",
        },
      ]);

      await loadAdminData();
    } catch (e: any) {
      alert("Error resolving dispute: " + (e?.message || "Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function dismissDispute(dispute: any) {
    if (!window.confirm("Revert this order back to active BOOKED state and dismiss the dispute?")) return;
    setBusyId(dispute.id);
    try {
      await supabase.from("orders").update({ status: "pending_offline" }).eq("id", dispute.order_id);
      await supabase.from("disputes").update({ status: "DISMISSED" }).eq("id", dispute.id);

      await logAudit("DISMISS_DISPUTE", "dispute", dispute.id, `Dismissed dispute for order ${dispute.order_id}. Order reverted to active BOOKED state.`);

      await loadAdminData();
    } catch (e: any) {
      alert("Error dismissing dispute: " + (e?.message || "Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  // USER MODERATION ACTIONS
  async function warnUser(targetUserId: string, name: string) {
    const warningMsg = window.prompt(`Issue an official administrative warning to ${name}:\n\nEnter warning message details:`);
    if (!warningMsg?.trim()) return;

    try {
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "request",
        title: "⚠️ Official Campus Mart Warning",
        body: warningMsg.trim(),
        action_url: "/notifications",
      });

      await logAudit("WARN_USER", "user", targetUserId, `Issued warning to user ${name}: "${warningMsg.trim()}"`);
      alert(`Official warning delivered to ${name}.`);
      await loadAdminData();
    } catch (e: any) {
      alert("Error warning user: " + (e?.message || "Please try again."));
    }
  }

  async function toggleSuspendUser(targetUserId: string, name: string, currentlySuspended: boolean) {
    const actionName = currentlySuspended ? "Unsuspend" : "Suspend";
    if (!window.confirm(`Are you sure you want to ${actionName.toLowerCase()} user ${name}?`)) return;

    try {
      await supabase.from("profiles").update({ suspended: !currentlySuspended }).eq("id", targetUserId);

      await logAudit(`${actionName.toUpperCase()}_USER`, "user", targetUserId, `${actionName}ed user ${name}.`);

      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "request",
        title: currentlySuspended ? "Account Reinstated" : "Account Suspended ⚠️",
        body: currentlySuspended
          ? "Your account suspension has been lifted by Campus Mart administration."
          : "Your account has been suspended due to community standard violations. Please contact support.",
        action_url: "/profile",
      });

      alert(`User ${name} has been ${currentlySuspended ? "reinstated" : "suspended"}.`);
      await loadAdminData();
    } catch (e: any) {
      alert(`Error updating user status: ` + (e?.message || "Please try again."));
    }
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="card-soft p-8 sm:p-12 space-y-4">
            <ShieldAlert className="h-16 w-16 mx-auto text-destructive animate-pulse" />
            <h1 className="text-2xl font-bold">Access Restricted</h1>
            <p className="text-muted-foreground text-sm">
              You must be an authorized Campus Mart Administrator to view the Dispute & Moderation Dashboard.
            </p>
            <div className="pt-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl gradient-brand text-primary-foreground font-semibold text-sm shadow-md"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const filteredDisputes = disputes.filter((d) => {
    if (disputeFilter === "PENDING") return d.status !== "RESOLVED_COMPLETED" && d.status !== "RESOLVED_CANCELLED" && d.status !== "DISMISSED";
    if (disputeFilter === "RESOLVED") return d.status === "RESOLVED_COMPLETED" || d.status === "RESOLVED_CANCELLED" || d.status === "DISMISSED";
    return true;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-orange" />
              <h1 className="text-2xl sm:text-3xl font-bold">Admin & Dispute Dashboard</h1>
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              Manage reported transaction disputes, inspect user behavior, and review system audit logs.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange/10 text-orange border border-orange/20">
              Authenticated Admin
            </span>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20" title="To use live Gemini LLM analysis, set VITE_GEMINI_API_KEY in Vercel environment variables">
              🤖 Gemini AI API: {import.meta.env?.VITE_GEMINI_API_KEY ? "Live API Connected" : "VITE_GEMINI_API_KEY (Rule Fallback)"}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setTab("disputes")}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              tab === "disputes"
                ? "border-orange text-orange"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Active Disputes ({disputes.length})
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              tab === "reports"
                ? "border-orange text-orange"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            User Reports ({reports.length})
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              tab === "audit"
                ? "border-orange text-orange"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: DISPUTES */}
        {tab === "disputes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm font-medium text-muted-foreground">
                Showing {filteredDisputes.length} transaction dispute(s)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
                <select
                  value={disputeFilter}
                  onChange={(e) => setDisputeFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium outline-none"
                >
                  <option value="ALL">All Disputes</option>
                  <option value="ESCALATED">🤖 Escalated to Admin (Needs Review)</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="RESOLVED">Resolved / Dismissed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="card-soft p-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40 text-emerald-500" />
                <p className="font-semibold text-foreground">No disputes matching filter</p>
                <p className="text-sm mt-1">All offline transactions are running smoothly!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDisputes.map((d) => {
                  const isResolved =
                    d.status === "RESOLVED_COMPLETED" ||
                    d.status === "RESOLVED_CANCELLED" ||
                    d.status === "RESOLVED_AUTO_CANCELLED" ||
                    d.status === "RESOLVED_AUTO_COMPLETED" ||
                    d.status === "DISMISSED";

                  return (
                    <div
                      key={d.id}
                      className="card-soft p-5 border border-border space-y-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base">
                              {d.products?.name || "Campus Listing"}
                            </span>
                            <span className="text-sm font-bold text-brand-2">
                              ₹{d.products?.price}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                isResolved
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-orange/10 text-orange border border-orange/20 animate-pulse"
                              }`}
                            >
                              {d.status || "DISPUTED — Frozen"}
                            </span>

                            {/* AI Decision Tag */}
                            {d.ai_decision && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                                🤖 AI: {d.ai_decision} ({d.ai_confidence ?? 85}%)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dispute Opened:{" "}
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        <Link
                          to="/chat"
                          search={{ id: d.order_id }}
                          className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-brand-2" /> Inspect Chat Log
                        </Link>
                      </div>

                      {/* Buyer & Seller Details Side-by-Side */}
                      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
                        <div>
                          <span className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Buyer Info
                          </span>
                          <div className="font-semibold text-foreground text-sm">
                            {d.buyer?.name || "Student"}
                          </div>
                          <div className="text-muted-foreground">
                            Dept: {d.buyer?.department || "N/A"}
                          </div>
                          <div className="text-muted-foreground">
                            Phone: {d.buyer?.phone || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <span className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Seller Info
                          </span>
                          <div className="font-semibold text-foreground text-sm">
                            {d.seller?.name || "Student"}
                          </div>
                          <div className="text-muted-foreground">
                            Dept: {d.seller?.department || "N/A"}
                          </div>
                          <div className="text-muted-foreground">
                            Phone: {d.seller?.phone || "Not provided"}
                          </div>
                        </div>
                      </div>

                      {/* AI Decision Analysis Box */}
                      {d.ai_reasoning && (
                        <div className="text-xs p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 font-bold text-purple-700">
                            <span>🤖 AI System Diagnosis ({d.ai_classification || "ANALYSIS"})</span>
                            <span>Confidence: {d.ai_confidence ?? 85}%</span>
                          </div>
                          <p className="text-muted-foreground">{d.ai_reasoning}</p>
                          {d.ai_recommended_action && (
                            <div className="text-[11px] font-semibold text-purple-800 pt-1 border-t border-purple-500/10">
                              💡 Recommendation: {d.ai_recommended_action}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reason & Description */}
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="font-semibold text-foreground">Submitted Reason: </span>
                          <span className="text-orange font-medium">{d.reason}</span>
                        </div>
                        {d.description && (
                          <div className="text-muted-foreground bg-card p-3 rounded-lg border border-border">
                            "{d.description}"
                          </div>
                        )}
                      </div>

                      {/* Admin Decision Actions */}
                      {!isResolved && (
                        <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-border">
                          <button
                            onClick={() => resolveCompleteDispute(d)}
                            disabled={busyId === d.id}
                            className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                          >
                            ✓ Resolve & Complete Transaction
                          </button>
                          <button
                            onClick={() => resolveCancelDispute(d)}
                            disabled={busyId === d.id}
                            className="h-9 px-3.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition disabled:opacity-50"
                          >
                            ✕ Cancel Transaction & Release Item
                          </button>
                          <button
                            onClick={() => dismissDispute(d)}
                            disabled={busyId === d.id}
                            className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-muted-foreground transition disabled:opacity-50"
                          >
                            Dismiss Dispute
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER REPORTS */}
        {tab === "reports" && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : reports.length === 0 ? (
              <div className="card-soft p-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40 text-emerald-500" />
                <p className="font-semibold text-foreground">No user reports submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((r) => {
                  const isSuspended = Boolean(r.reported?.suspended);

                  return (
                    <div
                      key={r.id}
                      className="card-soft p-5 border border-border space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">
                              Reported User: {r.reported?.name || "Student"}
                            </span>
                            {isSuspended && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-destructive text-white">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reported By: {r.reporter?.name || "Student"} ·{" "}
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => warnUser(r.reported_user_id, r.reported?.name || "User")}
                            className="h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white text-xs font-semibold transition"
                          >
                            Warn User
                          </button>
                          <button
                            onClick={() =>
                              toggleSuspendUser(
                                r.reported_user_id,
                                r.reported?.name || "User",
                                isSuspended
                              )
                            }
                            className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${
                              isSuspended
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-destructive text-white hover:bg-destructive/90"
                            }`}
                          >
                            {isSuspended ? "Reinstate User" : "Suspend User"}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border space-y-1">
                        <div>
                          <span className="font-semibold">Reason:</span> {r.reason}
                        </div>
                        {r.details && (
                          <div className="text-muted-foreground mt-1">"{r.details}"</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {tab === "audit" && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="card-soft p-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-foreground">No audit logs recorded yet</p>
              </div>
            ) : (
              <div className="card-soft divide-y divide-border overflow-hidden">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-foreground">{log.action}</div>
                      <div className="text-muted-foreground mt-0.5">{log.details}</div>
                    </div>
                    <div className="text-right text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
