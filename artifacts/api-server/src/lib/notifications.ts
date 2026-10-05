import { eq } from "drizzle-orm";
import { db, notificationChannelSettingsTable, notificationsTable } from "@workspace/db";

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
