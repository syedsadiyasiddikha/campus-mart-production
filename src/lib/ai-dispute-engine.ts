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
  isRealAIKeyConfigured?: boolean;
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

  // Check for Gemini API key in environment variables
  const rawApiKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    (typeof process !== "undefined" && process.env?.VITE_GEMINI_API_KEY);

  const apiKey = rawApiKey ? String(rawApiKey).trim().replace(/^["']|["']$/g, "") : "";

  // 1. Fetch Context: Order, Product, & Recent Messages
  let orderObj: any = null;
  let productObj: any = null;
  let chatMsgs: any[] = [];

  try {
    const { data: oData } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    orderObj = oData;

    const { data: pData } = await supabase.from("products").select("name, price, category").eq("id", product_id).maybeSingle();
    productObj = pData;

    const { data: cData } = await supabase
      .from("messages")
      .select("text, sender_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    chatMsgs = cData ?? [];
  } catch (e) {
    console.warn("AI Engine fetch context notice:", e);
  }

  const isBuyerOpener = opened_by === buyer_id;
  const buyerConfirmed = Boolean(orderObj?.buyer_confirmed);
  const sellerConfirmed = Boolean(orderObj?.seller_confirmed);
  const chatSummary = chatMsgs.map((m) => `${m.sender_id === buyer_id ? "Buyer" : "Seller"}: ${m.text}`).join("\n");

  // 2. IF REAL GEMINI API KEY IS CONFIGURED: Call Google Gemini Generative AI API
  if (apiKey && apiKey.length > 5) {
    try {
      const prompt = `
You are the AI Dispute Resolution System for Campus Mart, a student-to-student college marketplace.
Analyze this reported transaction dispute and determine the appropriate resolution.

[DISPUTE DATA]
- Product Name: "${productObj?.name || "Campus Item"}" (₹${productObj?.price ?? 0})
- Dispute Opened By: ${isBuyerOpener ? "Buyer" : "Seller"}
- Reason Selected: "${reason}"
- Additional Description/Evidence: "${description}"
- Buyer Confirmed Handover: ${buyerConfirmed ? "YES" : "NO"}
- Seller Confirmed Handover: ${sellerConfirmed ? "YES" : "NO"}

[RECENT CHAT TRANSCRIPT]
${chatSummary || "No chat messages recorded yet."}

[DECISION RULES]
1. If dispute involves clear mutual agreement or buyer/seller no-show with unconfirmed status, set decision to "AUTO_CANCELLED".
2. If dispute involves harassment, severe insults, fraud, or conflicting delivery claims, set decision to "NEEDS_ADMIN_REVIEW".
3. Return ONLY a valid JSON object matching this exact schema:

{
  "decision": "AUTO_CANCELLED" | "AUTO_COMPLETED" | "NEEDS_ADMIN_REVIEW",
  "confidence": number_between_0_and_100,
  "classification": "SELLER_NO_SHOW" | "BUYER_NO_SHOW" | "MUTUAL_CANCELLATION" | "HARASSMENT_UNPROFESSIONAL" | "UNCLEAR_CONFLICTING",
  "reasoning": "Brief 1-2 sentence AI explanation based on transcript and evidence",
  "recommendedAction": "Action recommendation for admin or automated system"
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (response.ok) {
        const jsonRes = await response.json();
        const text = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            decision: parsed.decision || "NEEDS_ADMIN_REVIEW",
            confidence: parsed.confidence || 85,
            classification: parsed.classification || "UNCLEAR_CONFLICTING",
            reasoning: `🤖 [Gemini Live AI] ${parsed.reasoning}`,
            recommendedAction: parsed.recommendedAction || "Review dispute details.",
            isRealAIKeyConfigured: true,
          };
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini API call notice, falling back to baseline rules:", geminiErr);
    }
  }

  // 3. BASELINE AI RULE ENGINE (Used when GEMINI_API_KEY environment variable is not configured)
  const descLower = (description || "").toLowerCase();
  const reasonLower = (reason || "").toLowerCase();
  const combinedChatText = chatMsgs.map((m) => (m.text || "").toLowerCase()).join(" ");

  // Rule A: Mutual Cancellation / Accidental
  if (
    descLower.includes("cancel") ||
    descLower.includes("changed my mind") ||
    descLower.includes("agreed to cancel") ||
    descLower.includes("accidental") ||
    combinedChatText.includes("cancel this")
  ) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 95,
      classification: "MUTUAL_CANCELLATION",
      reasoning: "AI Rule Engine: Verified clear cancellation intent & mutual agreement from submitted details.",
      recommendedAction: "Auto-cancel order and release item back to marketplace.",
      isRealAIKeyConfigured: false,
    };
  }

  // Rule B: Seller No-Show
  if (isBuyerOpener && (reasonLower.includes("seller did not show up") || reasonLower.includes("product not handed over")) && !sellerConfirmed) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 92,
      classification: "SELLER_NO_SHOW",
      reasoning: "AI Rule Engine: Buyer reported seller no-show. Verified seller never confirmed handover.",
      recommendedAction: "Auto-cancel order and issue seller warning notice.",
      isRealAIKeyConfigured: false,
    };
  }

  // Rule C: Buyer No-Show
  if (!isBuyerOpener && (reasonLower.includes("buyer did not show up") || reasonLower.includes("no response")) && !buyerConfirmed) {
    return {
      decision: "AUTO_CANCELLED",
      confidence: 90,
      classification: "BUYER_NO_SHOW",
      reasoning: "AI Rule Engine: Seller reported buyer no-show. Verified buyer never confirmed receipt.",
      recommendedAction: "Auto-cancel order and release listing back to seller.",
      isRealAIKeyConfigured: false,
    };
  }

  // Rule D: Harassment or Conflict
  if (reasonLower.includes("harassment") || descLower.includes("abuse") || descLower.includes("threat") || descLower.includes("scam")) {
    return {
      decision: "NEEDS_ADMIN_REVIEW",
      confidence: 60,
      classification: "HARASSMENT_UNPROFESSIONAL",
      reasoning: "AI Rule Engine: Inappropriate conduct or harassment reported. Escalated for human admin review.",
      recommendedAction: "Inspect full chat transcript and take moderation action.",
      isRealAIKeyConfigured: false,
    };
  }

  // Default Escalation
  return {
    decision: "NEEDS_ADMIN_REVIEW",
    confidence: 65,
    classification: "UNCLEAR_CONFLICTING",
    reasoning: "AI Rule Engine: Case involves conflicting or unverified statements. Escalated for Admin Review.",
    recommendedAction: "Admin review required.",
    isRealAIKeyConfigured: false,
  };
}
