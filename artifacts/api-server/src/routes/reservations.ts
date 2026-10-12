import { Router } from "express";
import { db, storesTable, tableReservationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();
const MIN_LEAD_MS = 30 * 60 * 1000;
const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;

function serializeReservation(row: typeof tableReservationsTable.$inferSelect) {
  return {
    ...row,
    reservationAt: row.reservationAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لعرض الحجوزات" });
      return;
    }
    const rows = await db.select().from(tableReservationsTable)
      .where(eq(tableReservationsTable.userId, userId))
      .orderBy(desc(tableReservationsTable.reservationAt));
    res.json(rows.map(serializeReservation));
  } catch (error) {
    req.log.error({ error }, "Failed to list table reservations");
    res.status(500).json({ error: "تعذر تحميل طلبات الحجز" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لإرسال طلب الحجز" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const occasion = typeof body.occasion === "string" ? body.occasion.trim().slice(0, 120) : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const storeId = Number(body.storeId);
    const bookingDays = Number(body.bookingDays ?? 1);
    const partySize = Number(body.partySize);
    const reservationAt = typeof body.reservationAt === "string" ? new Date(body.reservationAt) : new Date(NaN);
    const isVenueBooking = occasion.includes("قاعة") || body.paymentType === "full" || body.paymentType === "deposit" && body.paymentReceiptUrl != null;
    const paymentType = body.paymentType === "full" ? "full" : "deposit";
    const paymentAmount = Number(body.paymentAmount);
    const paymentWalletId = body.paymentWalletId == null ? null : Number(body.paymentWalletId);
    const transactionReference = typeof body.transactionReference === "string" ? body.transactionReference.trim().slice(0, 120) : "";
    const paymentReceiptUrl = typeof body.paymentReceiptUrl === "string" ? body.paymentReceiptUrl.trim() : "";

    if (!customerName || customerName.length > 200 || !customerPhone || customerPhone.length > 40) {
      res.status(400).json({ error: "يرجى إدخال الاسم ورقم الهاتف" });
      return;
    }
    if (!Number.isInteger(storeId) || storeId < 1 || !Number.isInteger(bookingDays) || bookingDays < 1 || bookingDays > 7 || !Number.isInteger(partySize) || partySize < 1 || partySize > 1000) {
      res.status(400).json({ error: "يرجى اختيار القاعة وتحديد مدة الحجز من يوم إلى 7 أيام وعدد الضيوف من 1 إلى 1000" });
      return;
    }
    if (Number.isNaN(reservationAt.getTime()) || reservationAt.getTime() < Date.now() + MIN_LEAD_MS || reservationAt.getTime() > Date.now() + MAX_LEAD_MS) {
      res.status(400).json({ error: "يجب اختيار موعد بعد 30 دقيقة وخلال الأشهر الستة القادمة" });
      return;
    }
    if (isVenueBooking) {
      res.status(410).json({ error: "حجز القاعات انتقل إلى مسار البيانات والحجز الحقيقي" });
      return;
    }

    const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.id, storeId));
    if (!store) {
      res.status(404).json({ error: "الفرع المختار غير موجود" });
      return;
    }
    const [insertResult] = await db.insert(tableReservationsTable).values({
      sessionId: String(userId),
      userId,
      storeId,
      reservationAt,
      bookingDays,
      partySize,
      customerName,
      customerPhone,
      occasion: occasion || null,
      notes: notes || null,
      status: "pending",
      paymentType: isVenueBooking ? paymentType : "deposit",
      paymentAmount: isVenueBooking ? paymentAmount : 0,
      platformFee: isVenueBooking ? 1000 : 0,
      paymentWalletId: isVenueBooking ? paymentWalletId : null,
      transactionReference: isVenueBooking ? transactionReference : null,
      paymentReceiptUrl: isVenueBooking ? paymentReceiptUrl : null,
      paymentStatus: isVenueBooking ? "pending_review" : "not_required",
    });
    const reservationId = Number(insertResult.insertId);
    if (!Number.isInteger(reservationId) || reservationId < 1) {
      res.status(500).json({ error: "تعذر حفظ طلب الحجز" });
      return;
    }
    const [created] = await db.select().from(tableReservationsTable).where(eq(tableReservationsTable.id, reservationId));
    if (!created) {
      res.status(500).json({ error: "تعذر استرجاع طلب الحجز" });
      return;
    }
    res.status(201).json(serializeReservation(created));
  } catch (error) {
    req.log.error({ error }, "Failed to create table reservation");
    res.status(500).json({ error: "تعذر إرسال طلب الحجز" });
  }
});

export default router;
