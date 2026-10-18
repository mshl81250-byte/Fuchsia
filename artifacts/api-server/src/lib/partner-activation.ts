import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, partnerActivationTokensTable } from "@workspace/db";
import { activationUrl, hashActivationToken } from "./partner-activation-crypto.js";

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function createPartnerActivationToken(userId: number, createdByUserId?: number | null): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
  await db.delete(partnerActivationTokensTable).where(and(eq(partnerActivationTokensTable.userId, userId), isNull(partnerActivationTokensTable.usedAt)));
  await db.insert(partnerActivationTokensTable).values({ userId, tokenHash: hashActivationToken(token), expiresAt, createdByUserId: createdByUserId ?? null });
  return { token, url: activationUrl(token), expiresAt };
}
