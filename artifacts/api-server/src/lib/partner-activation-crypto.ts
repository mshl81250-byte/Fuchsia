import crypto from "node:crypto";

export function hashActivationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function activationUrl(token: string): string {
  const base = (process.env.PARTNER_ACTIVATION_BASE_URL || process.env.PUBLIC_APP_URL || process.env.API_BASE_URL || "https://fuchsia-wvbrvhtl.manus.space").replace(/\/$/, "");
  return `${base}/api/auth/partner-activation/${encodeURIComponent(token)}`;
}
