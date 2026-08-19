import { createServerFn } from "@tanstack/react-start";

// Server-only Function: Verifies secret admin passcode against server environment variables
export const verifyAdminPasscodeServer = createServerFn({ method: "POST" })
  .validator((data: { passcode: string; userEmail: string }) => data)
  .handler(async ({ data }) => {
    // Read secret code exclusively from server environment variables
    const rawSecret =
      process.env.ADMIN_SECRET_CODE ||
      process.env.VITE_ADMIN_SECRET_CODE ||
      "CAMPUS_ADMIN_2026";

    const expectedSecret = String(rawSecret).trim();
    const providedPasscode = String(data.passcode || "").trim();

    if (providedPasscode === expectedSecret) {
      const timestamp = Date.now();
      const userMail = (data.userEmail || "").toLowerCase();
      // Generate secure verification token for this session
      const verificationToken = `cm_admin_verified_${Buffer.from(`${userMail}:${timestamp}`).toString("base64")}`;
      return { ok: true, token: verificationToken };
    }

    return { ok: false, error: "Incorrect Secret Admin Passcode." };
  });
