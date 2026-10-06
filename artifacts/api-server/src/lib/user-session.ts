import crypto from "crypto";
import type { Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, userSessionsTable } from "@workspace/db";

export async function authenticatedUserId(req: Request): Promise<number | null> {
  const authorization = req.header("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1];
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [session] = await db.select({ userId: userSessionsTable.userId, expiresAt: userSessionsTable.expiresAt })
    .from(userSessionsTable).where(eq(userSessionsTable.tokenHash, tokenHash));
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.userId;
}

export function sessionOwnsUser(userId: number, requestedUserId: number): boolean {
  return Number.isInteger(userId) && userId > 0 && userId === requestedUserId;
}
