import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "lamsa_salt_2024").digest("hex");
}

function generateToken(userId: number): string {
  return crypto.createHash("sha256").update(`${userId}_${Date.now()}_lamsa`).digest("hex");
}

function generateReferralCode(name: string): string {
  return name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return { ...rest, createdAt: user.createdAt.toISOString() };
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "البيانات المطلوبة مفقودة" });
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });

    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone: phone ?? null,
      isGuest: false,
      rewardPoints: 50,
      referralCode: generateReferralCode(fullName),
    }).returning();

    res.status(201).json({ user: safeUser(user), token: generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "البيانات مفقودة" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || user.isGuest) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }

    res.json({ user: safeUser(user), token: generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/guest", async (req, res) => {
  try {
    const guestName = `زائر_${Date.now()}`;
    const [user] = await db.insert(usersTable).values({
      fullName: "زائر",
      email: `${guestName}@guest.lamsa`,
      isGuest: true,
      rewardPoints: 0,
    }).returning();

    res.json({ user: safeUser(user), token: generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Guest login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    res.json(safeUser(user));
  } catch (err) {
    req.log.error({ err }, "Get profile failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const { userId, fullName, phone, address, avatarUrl } = req.body;
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    res.json(safeUser(user));
  } catch (err) {
    req.log.error({ err }, "Update profile failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
