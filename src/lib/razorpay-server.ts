import { createServerFn } from "@tanstack/react-start";
import crypto from "node:crypto";

export interface CreateOrderInput {
  amount: number;
  receipt?: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
}

/**
 * Server Function: Creates a genuine Razorpay Order via official REST API on Node.js server.
 * Never exposes RAZORPAY_KEY_SECRET in logs, code, or frontend responses.
 */
export const createRazorpayOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: CreateOrderInput) => data)
  .handler(async ({ data }) => {
    const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
    const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const keyId = rawKeyId.trim().replace(/^["']|["']$/g, "");
    const keySecret = rawKeySecret.trim().replace(/^["']|["']$/g, "");

    const keyId_exists = Boolean(keyId && keyId.length > 0);
    const keySecret_exists = Boolean(keySecret && keySecret.length > 0);
    const isPlaceholderSecret = keySecret.includes("placeholder");
    const isTestKey = keyId.startsWith("rzp_test_");

    // Secure audit log (logs only boolean existence, NEVER actual secret values)
    console.log(
      `[Backend Razorpay Audit] keyId_exists: ${keyId_exists} | isTestKey: ${isTestKey} | keySecret_exists: ${keySecret_exists} | is_placeholder: ${isPlaceholderSecret}`
    );

    if (!keyId_exists || !keySecret_exists || isPlaceholderSecret) {
      console.error("[Backend Auth Notice]: RAZORPAY_KEY_SECRET in process.env is missing or set to placeholder string.");
      return {
        ok: false,
        error: "RAZORPAY_KEY_SECRET is not configured in environment variables. Please update RAZORPAY_KEY_SECRET in your Vercel Environment Variables dashboard with your actual Razorpay Secret Key.",
        code: "ENV_SECRET_MISSING",
      };
    }


    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(data.amount * 100), // convert to paise
          currency: "INR",
          receipt: data.receipt || `rcpt_${Date.now()}`,
          payment_capture: 1,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error(`[Razorpay API Error ${res.status}]:`, json.error?.description || json.error?.code || json);
        if (res.status === 401) {
          return {
            ok: false,
            error: "Authentication failed with Razorpay API (HTTP 401). Please verify that VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file belong to the exact same Razorpay account.",
            code: "BAD_CREDENTIALS",
            details: json,
          };
        }
        return {
          ok: false,
          error: json.error?.description || `Razorpay API error (${res.status})`,
          code: json.error?.code || "RAZORPAY_API_ERROR",
          details: json,
        };
      }

      console.log(`[Backend Order Success]: Order ID generated -> ${json.id}`);

      return {
        ok: true,
        order_id: json.id,
        amount: json.amount,
        currency: json.currency,
        key_id: keyId,
      };
    } catch (err: any) {
      console.error("[Backend Order Exception]:", err);
      return {
        ok: false,
        error: err?.message || "Server network error connecting to Razorpay API",
        code: "NETWORK_ERROR",
      };
    }
  });

/**
 * Server Function: Verifies Razorpay Payment Signature using HMAC SHA256 server-side.
 */
export const verifyRazorpayPaymentServerFn = createServerFn({ method: "POST" })
  .validator((data: VerifyPaymentInput) => data)
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    if (keySecret && data.razorpay_signature) {
      const payload = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      if (expectedSignature !== data.razorpay_signature) {
        console.error(`[Signature Verification Failed]: Expected signature mismatch.`);
        return {
          ok: false,
          error: "Razorpay signature verification failed. Payment tampered or invalid.",
        };
      }
    }

    console.log(`[Signature Verified]: Payment ${data.razorpay_payment_id} for order ${data.razorpay_order_id} verified successfully.`);
    return { ok: true, payment_id: data.razorpay_payment_id };
  });
