import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const ADMIN_SESSION_COOKIE = "fuchsia_admin_session";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_EMAIL = "admin@fuchsia.ye";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for admin authentication");
  }
  return secret;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fuchsia_salt_2024").digest("hex");
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSession(userId: number): string {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function readSession(value: unknown): { userId: number; expiresAt: number } | null {
  if (typeof value !== "string") return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      expiresAt?: unknown;
    };

    if (
      typeof parsed.userId !== "number" ||
      !Number.isInteger(parsed.userId) ||
      parsed.userId <= 0 ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export async function authenticateAdmin(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
  if (!user || user.isGuest || !user.passwordHash) return null;

  const expectedHash = Buffer.from(user.passwordHash);
  const actualHash = Buffer.from(hashPassword(password));
  if (expectedHash.length !== actualHash.length || !crypto.timingSafeEqual(expectedHash, actualHash)) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  };
}

export function setAdminSession(res: Response, userId: number): void {
  res.cookie(ADMIN_SESSION_COOKIE, createSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_TTL_MS,
    path: "/",
  });
}

export function clearAdminSession(res: Response): void {
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = readSession(req.cookies?.[ADMIN_SESSION_COOKIE]);
    if (!session) {
      res.status(401).json({ error: "تسجيل الدخول مطلوب" });
      return;
    }

    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));

    if (!user) {
      clearAdminSession(res);
      res.status(401).json({ error: "جلسة الإدارة غير صالحة" });
      return;
    }

    next();
  } catch (err) {
    req.log.error({ err }, "Admin session validation failed");
    res.status(500).json({ error: "تعذر التحقق من جلسة الإدارة" });
  }
}