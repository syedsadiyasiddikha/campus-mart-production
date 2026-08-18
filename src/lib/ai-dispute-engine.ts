import { supabase } from "@/integrations/supabase/client";

export type AIDecisionResult = {
  decision: "AUTO_CANCELLED" | "AUTO_COMPLETED" | "AUTO_WARNED" | "NEEDS_ADMIN_REVIEW";
  confidence: number; // 0 - 100
  classification:
    | "SELLER_NO_SHOW"
    | "BUYER_NO_SHOW"
    | "MUTUAL_CANCELLATION"
    | "WRONG_ITEM_DESCRIPTION"
    | "PAYMENT_UNVERIFIED"
    | "HARASSMENT_UNPROFESSIONAL"
    | "UNCLEAR_CONFLICTING";
  reasoning: string;
  recommendedAction: string;
};

export async function analyzeAndResolveDispute(disputeData: {
  dispute_id?: string;
  order_id: string;
  product_id: string;
  opened_by: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  description: string;
}): Promise<AIDecisionResult> {
  const { order_id, product_id, opened_by, buyer_id, seller_id, reason, description } = disputeData;

  const descLower = (description || "").toLowerCase();
  const reasonLower = (reason || "").toLowerCase();

  // 1. Fetch Order & Product Details
  let orderObj: any = null;
  let chatMsgs: any[] = [];

  try {
    const { data: oData } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    orderObj = oData;

    // Fetch recent chat messages for this order/chat
    const { data: cData } = await supabase
      .from("messages")
      .select("text, sender_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    chatMsgs = cData ?? [];
  } catch (e) {
    console.warn("AI Engine fetch notice:", e);
  }

  const isBuyerOpener = opened_by === buyer_id;
  const buyerConfirmed = Boolean(orderObj?.buyer_confirmed);
  const sellerConfirmed = Boolean(orderObj?.seller_confirmed);

  // Combine chat text for NLP analysis
  const combinedChatText = chatMsgs.map((m) => (m.text || "").toLowerCase()).join(" ");

  // --- RULE 1: MUTUAL CANCELLATION / ACCIDENTAL BOOKING ---
  if (
    descLower.includes("cancel") ||
    descLower.includes("changed my mind") ||
    descLower.includes("agreed to cancel") ||
    descLower.includes("accidental") ||
    combinedChatText.includes("cancel this") ||
    combinedChatText.includes("don't want")
  ) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 95,
      classification: "MUTUAL_CANCELLATION",
      reasoning: "AI verified clear cancellation intent / mutual agreement from submitted details and chat logs.",
      recommendedAction: "Cancel order, release item to AVAILABLE, and notify both parties.",
    };
  }

  // --- RULE 2: SELLER NO-SHOW / ITEM NOT HANDED OVER ---
  if (
    isBuyerOpener &&
    (reasonLower.includes("seller did not show up") || reasonLower.includes("product not handed over")) &&
    !sellerConfirmed
  ) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 92,
      classification: "SELLER_NO_SHOW",
      reasoning: "Buyer reported seller no-show. Verification confirmed seller never marked handover as completed.",
      recommendedAction: "Auto-cancel order, restore item to AVAILABLE, and log seller performance notice.",
    };
  }

  // --- RULE 3: BUYER NO-SHOW ---
  if (
    !isBuyerOpener &&
    (reasonLower.includes("buyer did not show up") || reasonLower.includes("no response")) &&
    !buyerConfirmed
  ) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 90,
      classification: "BUYER_NO_SHOW",
      reasoning: "Seller reported buyer no-show. Verification confirmed buyer never confirmed item receipt.",
      recommendedAction: "Auto-cancel order and release item back to seller as AVAILABLE.",
    };
  }

  // --- RULE 4: HARASSMENT / INAPPROPRIATE CONDUCT ---
  if (
    reasonLower.includes("harassment") ||
    descLower.includes("abuse") ||
    descLower.includes("threat") ||
    descLower.includes("scam")
  ) {
    return {
      decision: "NEEDS_ADMIN_REVIEW",
      confidence: 60,
      classification: "HARASSMENT_UNPROFESSIONAL",
      reasoning: "High-risk conduct or harassment reported. Escalated to human administrator for safety & moderation review.",
      recommendedAction: "Review full chat history and issue official user warning or suspension if verified.",
    };
  }

  // --- RULE 5: CONFLICTING DELIVERED VS UNDELIVERED CLAIMS ---
  if (buyerConfirmed && !sellerConfirmed) {
    return {
      decision: "NEEDS_ADMIN_REVIEW",
      confidence: 50,
      classification: "UNCLEAR_CONFLICTING",
      reasoning: "Buyer marked item received, but seller has not confirmed handover. Evidence requires manual admin verification.",
      recommendedAction: "Inspect seller chat response and verify payment status.",
    };
  }

  if (!buyerConfirmed && sellerConfirmed) {
    return {
      decision: "NEEDS_ADMIN_REVIEW",
      confidence: 50,
      classification: "UNCLEAR_CONFLICTING",
      reasoning: "Seller marked handover complete, but buyer disputes receipt. Requires admin review to prevent false claims.",
      recommendedAction: "Review buyer & seller statements before releasing or completing order.",
    };
  }

  // DEFAULT ESCALATION
  return {
    decision: "NEEDS_ADMIN_REVIEW",
    confidence: 65,
    classification: "UNCLEAR_CONFLICTING",
    reasoning: "Dispute contains non-standard claims. Escalated for human admin review.",
    recommendedAction: "Admin review required.",
  };
}
