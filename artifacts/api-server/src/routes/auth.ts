import { Router } from "express";
import { db, pool } from "@workspace/db";
import { usersTable, emailVerificationCodesTable, userSessionsTable, partnerActivationTokensTable } from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import crypto from "crypto";
import { sendVerificationCodeEmail } from "../lib/notifications";
import { authenticatedUserId } from "../lib/user-session";
import { hashPassword, needsPasswordUpgrade, shouldReturnDebugOtp, verifyPassword } from "../lib/auth-security.js";
import { hashActivationToken } from "../lib/partner-activation-crypto.js";

const router = Router();

async function generateToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  await db.delete(userSessionsTable).where(and(eq(userSessionsTable.userId, userId), lt(userSessionsTable.expiresAt, now)));
  await db.insert(userSessionsTable).values({
    userId,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

function bearerToken(req: import("express").Request): string | null {
  return req.header("Authorization")?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1] ?? null;
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

function activationPage(title: string, body: string): string {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:Arial,sans-serif;background:#fff0f6;color:#24131d;padding:24px}main{max-width:480px;margin:40px auto;background:#fff;border:1px solid #f0d4e5;border-radius:24px;padding:28px;box-shadow:0 12px 36px #d81b6020}h1{color:#d81b60}label{display:block;margin:16px 0 6px;font-weight:700}input,button{box-sizing:border-box;width:100%;padding:13px;border-radius:12px;border:1px solid #d9c1cf;font-size:16px}button{margin-top:20px;background:#d81b60;color:#fff;border:0;font-weight:700}p{line-height:1.8;color:#6b5260}.ok{color:#16734a}</style><main><h1>فوشيا</h1>${body}</main></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

async function activationRecord(token: string) {
  const [record] = await db.select({ id: partnerActivationTokensTable.id, userId: partnerActivationTokensTable.userId, expiresAt: partnerActivationTokensTable.expiresAt, usedAt: partnerActivationTokensTable.usedAt, fullName: usersTable.fullName })
    .from(partnerActivationTokensTable).innerJoin(usersTable, eq(partnerActivationTokensTable.userId, usersTable.id)).where(eq(partnerActivationTokensTable.tokenHash, hashActivationToken(token)));
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
  return record;
}

router.get("/partner-activation/:token", async (req, res): Promise<void> => {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  const record = await activationRecord(token);
  if (!record) { res.status(410).type("html").send(activationPage("رابط منتهي", "<h2>رابط التفعيل غير صالح</h2><p>انتهت صلاحية الرابط أو تم استخدامه. اطلب رابط تفعيل جديدًا من الإدارة.</p>")); return; }
  res.type("html").send(activationPage("تفعيل حساب أعمال فوشيا", `<h2>مرحباً ${escapeHtml(record.fullName)}</h2><p>أنشئ كلمة مرور جديدة لحسابك في تطبيق أعمال فوشيا بوكينج. الرابط صالح لمرة واحدة.</p><form method="post"><label for="password">كلمة المرور الجديدة</label><input id="password" name="password" type="password" minlength="8" maxlength="128" required><label for="confirmPassword">تأكيد كلمة المرور</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="128" required><button type="submit">تفعيل الحساب</button></form>`));
});

router.post("/partner-activation/:token", async (req, res): Promise<void> => {
  try {
    const token = typeof req.params.token === "string" ? req.params.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";
    const record = await activationRecord(token);
    if (!record) { res.status(410).type("html").send(activationPage("رابط منتهي", "<h2>رابط التفعيل غير صالح</h2><p>اطلب رابط تفعيل جديدًا من الإدارة.</p>")); return; }
    if (password.length < 8 || password.length > 128 || password !== confirmPassword) { res.status(400).type("html").send(activationPage("بيانات غير صحيحة", "<h2>تعذر تفعيل الحساب</h2><p>تأكد من تطابق كلمتي المرور وأنهما من 8 أحرف على الأقل.</p>")); return; }
    const result = await db.transaction(async (tx) => {
      const updated = await tx.update(partnerActivationTokensTable).set({ usedAt: new Date() }).where(and(eq(partnerActivationTokensTable.id, record.id), isNull(partnerActivationTokensTable.usedAt)));
      if (Number(updated[0].affectedRows) !== 1) return false;
      await tx.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.id, record.userId));
      return true;
    });
    if (!result) { res.status(410).type("html").send(activationPage("رابط منتهي", "<h2>تم استخدام رابط التفعيل</h2>")); return; }
    res.type("html").send(activationPage("تم التفعيل", "<h2 class=\"ok\">تم تفعيل الحساب بنجاح</h2><p>يمكنك الآن فتح تطبيق أعمال فوشيا بوكينج وتسجيل الدخول بكلمة المرور الجديدة.</p>"));
  } catch (err) {
    req.log.error({ err }, "Partner activation failed");
    res.status(500).type("html").send(activationPage("خطأ", "<h2>تعذر تفعيل الحساب</h2><p>حاول مرة أخرى لاحقًا.</p>"));
  }
});

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
    const debugOtpRequested = shouldReturnDebugOtp(process.env.NODE_ENV, process.env.MOBILE_OTP_DEBUG);
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

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    if (needsPasswordUpgrade(user.passwordHash)) {
      await db.update(usersTable)
        .set({ passwordHash: hashPassword(password) })
        .where(eq(usersTable.id, user.id));
    }

    res.json({ user: safeUser(user), token: await generateToken(user.id) });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/logout", async (req, res): Promise<void> => {
  const token = bearerToken(req);
  if (token) await db.delete(userSessionsTable).where(eq(userSessionsTable.tokenHash, crypto.createHash("sha256").update(token).digest("hex")));
  res.status(204).send();
});

router.post("/logout-all", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ code: "AUTH_REQUIRED", error: "يلزم تسجيل الدخول" }); return; }
  await db.delete(userSessionsTable).where(eq(userSessionsTable.userId, userId));
  res.status(204).send();
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
    const { fullName, phone, secondPhone, address, avatarUrl } = req.body ?? {};
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
    if (secondPhone !== undefined) {
      if (typeof secondPhone !== "string" || secondPhone.trim().length > 40) {
        res.status(400).json({ error: "رقم التواصل الإضافي غير صحيح" });
        return;
      }
      updates.secondPhone = secondPhone.trim() || null;
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

router.delete("/account", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!userId) { res.status(401).json({ error: "يلزم تسجيل الدخول لحذف الحساب" }); return; }
  if (reason.length < 10 || reason.length > 1000) { res.status(400).json({ error: "اكتب سبب حذف الحساب (10 أحرف على الأقل)" }); return; }
  try {
    await pool.query("UPDATE users SET full_name = ?, email = ?, password_hash = NULL, phone = NULL, second_phone = NULL, address = NULL, avatar_url = NULL, account_type = 'deleted' WHERE id = ?", [`حساب محذوف`, `deleted_${userId}@deleted.fuchsia`, userId]);
    await db.delete(userSessionsTable).where(eq(userSessionsTable.userId, userId));
    res.json({ success: true, message: "تم حذف الحساب وإخفاء بياناته الشخصية" });
  } catch (err) {
    req.log.error({ err }, "Delete account failed");
    res.status(500).json({ error: "تعذر حذف الحساب حاليًا" });
  }
});

export default router;
