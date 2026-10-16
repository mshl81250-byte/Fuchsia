import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, emailVerificationCodesTable, userSessionsTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import crypto from "crypto";
import { sendVerificationCodeEmail } from "../lib/notifications";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fuchsia_salt_2024").digest("hex");
}

async function generateToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  await db.delete(userSessionsTable).where(and(eq(userSessionsTable.userId, userId), lt(userSessionsTable.expiresAt, now)));
  await db.insert(userSessionsTable).values({
    userId,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
  });
  return token;
}

function generateReferralCode(name: string): string {
  return name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hashVerificationCode(code: string): string {
  return crypto.createHash("sha256").update(`${code}:${process.env.SESSION_SECRET || "verification-secret"}`).digest("hex");
}

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return { ...rest, createdAt: user.createdAt.toISOString() };
}

router.post("/register/request-code", async (req, res): Promise<void> => {
  try {
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : null;
    if (fullName.length < 2 || fullName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: "تحقق من الاسم والبريد وكلمة المرور (8 أحرف على الأقل)" });
      return;
    }

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      return;
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    await db.insert(emailVerificationCodesTable).values({
      email,
      fullName,
      passwordHash: hashPassword(password),
      phone,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000),
      attempts: 0,
    }).onDuplicateKeyUpdate({ set: {
      fullName, passwordHash: hashPassword(password), phone, codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), attempts: 0, createdAt: new Date(),
    } });
    const debugOtpRequested =
      process.env.MOBILE_OTP_DEBUG === "true" || req.header("X-Fuchsia-OTP-Debug") === "true";
    try {
      await sendVerificationCodeEmail({ email, name: fullName, code });
    } catch (emailError) {
      if (!debugOtpRequested) throw emailError;
      req.log.warn({ emailError }, "Verification email unavailable; returning debug OTP for development flow");
    }
    res.status(202).json({
      message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      expiresInSeconds: 180,
      ...(debugOtpRequested ? { debugCode: code } : {}),
    });
  } catch (err) {
    req.log.error({ err }, "Registration verification email failed");
    res.status(503).json({ error: "تعذر إرسال رمز التحقق حالياً، حاول لاحقاً" });
  }
});

router.post("/register/verify-code", async (req, res): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "رمز التحقق غير صحيح" });
      return;
    }
    const [pending] = await db.select().from(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.email, email));
    if (!pending || pending.expiresAt <= new Date()) {
      res.status(410).json({ error: "انتهت صلاحية الرمز، اطلب رمزاً جديداً" });
      return;
    }
    if (pending.attempts >= 5) {
      res.status(429).json({ error: "تجاوزت عدد المحاولات، اطلب رمزاً جديداً" });
      return;
    }
    if (pending.codeHash !== hashVerificationCode(code)) {
      await db.update(emailVerificationCodesTable).set({ attempts: pending.attempts + 1 }).where(eq(emailVerificationCodesTable.id, pending.id));
      res.status(401).json({ error: "رمز التحقق غير صحيح" });
      return;
    }
    await db.insert(usersTable).values({ fullName: pending.fullName, email: pending.email, passwordHash: pending.passwordHash, phone: pending.phone, isGuest: false, rewardPoints: 50, referralCode: generateReferralCode(pending.fullName) });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, pending.email));
    if (!user) { res.status(500).json({ error: "تعذر إنشاء الحساب" }); return; }
    await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.id, pending.id));
    res.status(201).json({ user: safeUser(user), token: await generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Registration verification failed");
    res.status(500).json({ error: "تعذر إكمال إنشاء الحساب" });
  }
});

router.post("/register", async (req, res): Promise<void> => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "البيانات المطلوبة مفقودة" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      return;
    }

    await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone: phone ?? null,
      isGuest: false,
      rewardPoints: 50,
      referralCode: generateReferralCode(fullName),
    });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) { res.status(500).json({ error: "تعذر إنشاء الحساب" }); return; }

    res.status(201).json({ user: safeUser(user), token: await generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "البيانات مفقودة" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || user.isGuest) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    if (user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    res.json({ user: safeUser(user), token: await generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/guest", async (req, res): Promise<void> => {
  try {
    const guestName = `زائر_${Date.now()}`;
    const email = `${guestName}@guest.fuchsia`;
    await db.insert(usersTable).values({
      fullName: "زائر",
      email,
      isGuest: true,
      rewardPoints: 0,
    });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(500).json({ error: "تعذر إنشاء حساب الضيف" });
      return;
    }

    res.json({ user: safeUser(user), token: await generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Guest login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/profile", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لعرض بيانات الحساب" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    res.json(safeUser(user));
  } catch (err) {
    req.log.error({ err }, "Get profile failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.patch("/profile", async (req, res): Promise<void> => {
  try {
    const { fullName, phone, address, avatarUrl } = req.body ?? {};
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لتعديل بيانات الحساب" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
        res.status(400).json({ error: "الاسم غير صحيح" });
        return;
      }
      updates.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.trim().length > 40) {
        res.status(400).json({ error: "رقم الهاتف غير صحيح" });
        return;
      }
      updates.phone = phone.trim() || null;
    }
    if (address !== undefined) {
      if (typeof address !== "string" || address.trim().length > 1000) {
        res.status(400).json({ error: "عنوان التوصيل غير صحيح" });
        return;
      }
      updates.address = address.trim() || null;
    }
    if (avatarUrl !== undefined && typeof avatarUrl === "string" && avatarUrl.length <= 2048) {
      updates.avatarUrl = avatarUrl;
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    res.json(safeUser(user));
  } catch (err) {
    req.log.error({ err }, "Update profile failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
