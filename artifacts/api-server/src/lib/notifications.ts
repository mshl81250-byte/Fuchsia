import { eq } from "drizzle-orm";
import { db, notificationChannelSettingsTable, notificationsTable, partnerNotificationsTable } from "@workspace/db";
import { dispatchPartnerPushNotification } from "./partner-push";

export async function sendVerificationCodeEmail(input: { email: string; name: string; code: string }): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const logoUrl = process.env.EMAIL_LOGO_URL || "https://fuchsia.ye/logo.png";
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#fff0f6;font-family:Arial,sans-serif;color:#24131d">
    <div style="max-width:560px;margin:32px auto;padding:0 16px"><div style="background:#fff;border:1px solid #f0d4e5;border-radius:28px;overflow:hidden;box-shadow:0 12px 36px rgba(216,27,96,.12)">
      <div style="padding:30px;text-align:center;background:linear-gradient(135deg,#d81b60,#f48fb1)"><img src="${logoUrl}" alt="فوشيا" style="width:76px;height:76px;object-fit:contain;background:#fff;border-radius:22px;padding:8px"><h1 style="color:#fff;margin:14px 0 0;font-size:28px">فوشيا</h1></div>
      <div style="padding:34px 28px;text-align:center"><p style="font-size:18px;margin:0 0 12px">مرحباً ${input.name || "بك"}</p><p style="font-size:15px;line-height:1.8;color:#6b6b6b">استخدم رمز التحقق التالي لإكمال إنشاء حسابك في فوشيا:</p>
        <div style="direction:ltr;letter-spacing:10px;font-size:34px;font-weight:700;color:#d81b60;background:#fff0f6;border:1px dashed #d81b60;border-radius:16px;padding:18px;margin:24px 0">${input.code}</div>
        <p style="font-size:13px;color:#8a6b78;margin:0">صلاحية الرمز 3 دقائق فقط. إذا لم تطلب إنشاء الحساب فتجاهل هذه الرسالة.</p>
      </div><div style="padding:18px;text-align:center;background:#fff8fb;color:#9b7a88;font-size:12px">فوشيا — روعة المناسبات في مكان واحد</div>
    </div></div></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "notifications@fuchsia.ye", to: [input.email], subject: "رمز التحقق لإنشاء حسابك في فوشيا", html }),
  });
  if (!response.ok) throw new Error(`Verification email failed with status ${response.status}`);
}

type NotificationInput = {
  sessionId: string;
  orderId?: number | null;
  type: string;
  title: string;
  message: string;
  customerName?: string | null;
  phone?: string | null;
  email?: string | null;
};

function render(template: string, input: NotificationInput) {
  return template
    .replaceAll("{name}", input.customerName || "عميلنا العزيز")
    .replaceAll("{order}", input.orderId ? String(input.orderId) : "—")
    .replaceAll("{status}", input.message);
}

function normalizeYemenPhone(phone: string) {
  const value = phone.replace(/[^\d+]/g, "");
  if (value.startsWith("00")) return `+${value.slice(2)}`;
  if (value.startsWith("7")) return `+967${value}`;
  return value;
}

export async function sendVenueOwnerCredentials(input: {
  channel: "email" | "whatsapp";
  fullName: string;
  username: string;
  password: string;
  email?: string | null;
  phone?: string | null;
}): Promise<void> {
  const settings = await db.select().from(notificationChannelSettingsTable).where(eq(notificationChannelSettingsTable.enabled, true));
  const setting = settings.find(item => item.channel === input.channel);
  if (!setting) throw new Error(`قناة ${input.channel} غير مفعلة`);

  const message = `مرحباً ${input.fullName || "بك"}،\nتم إنشاء حسابك في تطبيق أعمال فوشيا.\nاسم المستخدم: ${input.username}\nكلمة المرور المؤقتة: ${input.password}\nيرجى تغيير كلمة المرور بعد أول دخول وعدم مشاركة هذه الرسالة.`;
  if (input.channel === "email") {
    if (!input.email || !process.env.RESEND_API_KEY || setting.provider !== "Resend") throw new Error("إعدادات البريد غير مكتملة");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: setting.sender || process.env.EMAIL_FROM || "notifications@fuchsia.ye", to: [input.email], subject: "بيانات دخول تطبيق أعمال فوشيا", text: message }),
    });
    if (!response.ok) throw new Error(`فشل إرسال البريد (${response.status})`);
    return;
  }

  if (!input.phone || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || setting.provider !== "WhatsApp Business Cloud API") throw new Error("إعدادات واتساب غير مكتملة");
  const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: normalizeYemenPhone(input.phone), type: "text", text: { body: message } }),
  });
  if (!response.ok) throw new Error(`فشل إرسال واتساب (${response.status})`);
}

async function dispatchExternal(input: NotificationInput) {
  const settings = await db.select().from(notificationChannelSettingsTable).where(eq(notificationChannelSettingsTable.enabled, true));
  const whatsapp = settings.find(item => item.channel === "whatsapp");
  const email = settings.find(item => item.channel === "email");

  if (whatsapp && input.phone && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && whatsapp.provider === "WhatsApp Business Cloud API") {
    try {
      await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: normalizeYemenPhone(input.phone), type: "text", text: { body: render(whatsapp.template, input) } }),
      });
    } catch (error) { console.error("WhatsApp notification failed", error); }
  }

  if (email && input.email && process.env.RESEND_API_KEY && email.provider === "Resend") {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: email.sender || process.env.EMAIL_FROM || "notifications@fuchsia.ye", to: [input.email], subject: input.title, text: render(email.template, input) }),
      });
    } catch (error) { console.error("Email notification failed", error); }
  }
}

export async function createCustomerNotification(input: NotificationInput) {
  if (!input.sessionId) return;
  await db.insert(notificationsTable).values({ sessionId: input.sessionId, orderId: input.orderId ?? null, type: input.type, title: input.title, message: input.message });
  await dispatchExternal(input);
}

export async function createPartnerNotification(input: {
  recipientUserId: number;
  bookingType?: "venue" | "rental" | "product";
  bookingId?: number;
  requestId?: number;
  type: string;
  title: string;
  message: string;
}) {
  if (!Number.isInteger(input.recipientUserId) || input.recipientUserId < 1) return;
  await db.insert(partnerNotificationsTable).values({
    recipientUserId: input.recipientUserId,
    bookingType: input.bookingType ?? null,
    bookingId: input.bookingId ?? null,
    requestId: input.requestId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
  });
  void dispatchPartnerPushNotification(input).catch((error) => {
    console.error("Partner push notification dispatch failed", { error, userId: input.recipientUserId });
  });
}
