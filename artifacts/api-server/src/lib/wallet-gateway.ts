import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, walletTransactionsTable } from "@workspace/db";

export type RefundResult = {
  transactionId: number;
  status: "submitted" | "manual_required" | "failed";
  provider: string;
  externalId: string | null;
};

function providerName() {
  return process.env.PAYMENT_PROVIDER_NAME || "manual_local_wallet";
}

function configured() {
  return Boolean(process.env.PAYMENT_PROVIDER_BASE_URL && process.env.PAYMENT_PROVIDER_API_KEY);
}

export function isWalletProviderConfigured() {
  return configured();
}

export async function requestWalletRefund(input: {
  orderId: number;
  walletId: number | null;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<RefundResult> {
  const [existing] = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing) {
    return { transactionId: existing.id, status: existing.status === "submitted" ? "submitted" : existing.status === "failed" ? "failed" : "manual_required", provider: existing.provider, externalId: existing.externalId };
  }

  const provider = providerName();
  await db.insert(walletTransactionsTable).values({
    orderId: input.orderId,
    walletId: input.walletId,
    kind: "refund",
    status: configured() ? "pending" : "manual_required",
    amount: input.amount,
    currency: "YER",
    provider,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason || null,
  });
  const [transaction] = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.idempotencyKey, input.idempotencyKey)).limit(1);
  if (!transaction) throw new Error("تعذر إنشاء معاملة الاسترداد");
  if (!configured()) return { transactionId: transaction.id, status: "manual_required", provider, externalId: null };

  try {
    const response = await fetch(`${process.env.PAYMENT_PROVIDER_BASE_URL!.replace(/\/$/, "")}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYMENT_PROVIDER_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({ orderId: input.orderId, walletId: input.walletId, amount: input.amount, currency: "YER", reason: input.reason }),
    });
    const rawResponse = await response.text();
    let externalId: string | null = null;
    try { externalId = JSON.parse(rawResponse)?.id ?? JSON.parse(rawResponse)?.refundId ?? null; } catch { /* keep raw response for audit */ }
    const status = response.ok ? "submitted" : "failed";
    await db.update(walletTransactionsTable).set({ status, externalId, rawResponse: rawResponse.slice(0, 5000), processedAt: response.ok ? new Date() : null }).where(eq(walletTransactionsTable.id, transaction.id));
    return { transactionId: transaction.id, status, provider, externalId };
  } catch (error) {
    await db.update(walletTransactionsTable).set({ status: "failed", rawResponse: error instanceof Error ? error.message : "provider request failed" }).where(eq(walletTransactionsTable.id, transaction.id));
    return { transactionId: transaction.id, status: "failed", provider, externalId: null };
  }
}

export function verifyWalletWebhook(rawBody: string, signature: string | undefined) {
  const secret = process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature.replace(/^sha256=/, ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
