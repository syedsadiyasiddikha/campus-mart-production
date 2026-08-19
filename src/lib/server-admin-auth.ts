import { createServerFn } from "@tanstack/react-start";

// Server-only Function: Verifies secret admin passcode against server environment variables
export const verifyAdminPasscodeServer = createServerFn({ method: "POST" })
  .validator((data: { passcode: string; userEmail: string }) => data)
  .handler(async ({ data }) => {
    // Read secret code safely from environment variables
    const rawSecret =
      (typeof process !== "undefined" && process?.env?.ADMIN_SECRET_CODE) ||
      (typeof process !== "undefined" && process?.env?.VITE_ADMIN_SECRET_CODE) ||
      (typeof import.meta !== "undefined" && import.meta?.env?.VITE_ADMIN_SECRET_CODE) ||
      "CAMPUS_ADMIN_2026";

    const expectedSecret = String(rawSecret).trim();
    const providedPasscode = String(data.passcode || "").trim();

    if (providedPasscode === expectedSecret) {
      const timestamp = Date.now();
      const userMail = (data.userEmail || "").toLowerCase();
      const tokenPayload = `${userMail}:${timestamp}`;
      const encoded = typeof btoa !== "undefined" ? btoa(tokenPayload) : String(timestamp);
      const verificationToken = `cm_admin_verified_${encoded}`;
      return { ok: true, token: verificationToken };
    }

    return { ok: false, error: "Incorrect Secret Admin Passcode." };
  });
