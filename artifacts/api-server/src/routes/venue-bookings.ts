import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db, pool, paymentWalletsTable, venueBookingsTable, venueBookingEventsTable, bookingChangeRequestsTable } from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { authenticatedUserId } from "../lib/user-session";
import { createCustomerNotification, createPartnerNotification } from "../lib/notifications";

const router = Router();
const MIN_LEAD_MS = 30 * 60 * 1000;
const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;
const PLATFORM_FEE = 1000;
const HOLD_MINUTES = 30;

function serializeBooking(row: typeof venueBookingsTable.$inferSelect) {
  return {
    ...row,
    venueId: row.venueId,
    reservationAt: row.reservationAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeRawBooking(row: RowDataPacket) {
  return {
    id: Number(row.id),
    venueId: Number(row.venue_id),
    audience: String(row.audience),
    reservationAt: new Date(row.reservation_at).toISOString(),
    bookingDays: Number(row.booking_days),
    partySize: Number(row.party_size),
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    dailyPriceSnapshot: Number(row.daily_price_snapshot),
    totalAmount: Number(row.total_amount),
    paymentType: String(row.payment_type),
    paymentAmount: Number(row.payment_amount),
    platformFee: Number(row.platform_fee),
    paymentWalletId: row.payment_wallet_id == null ? null : Number(row.payment_wallet_id),
    transactionReference: row.transaction_reference == null ? null : String(row.transaction_reference),
    paymentReceiptUrl: row.payment_receipt_url == null ? null : String(row.payment_receipt_url),
    paymentStatus: String(row.payment_status),
    status: String(row.status),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    notes: row.notes == null ? null : String(row.notes),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "يلزم تسجيل الدخول لعرض الحجوزات" }); return; }
    const rows = await db.select().from(venueBookingsTable)
      .where(eq(venueBookingsTable.customerUserId, userId))
      .orderBy(desc(venueBookingsTable.reservationAt));
    res.setHeader("Cache-Control", "no-store");
    const result = await Promise.all(rows.map(async (booking) => {
      const [events, requests] = await Promise.all([
        db.select().from(venueBookingEventsTable).where(eq(venueBookingEventsTable.bookingId, booking.id))
          .orderBy(asc(venueBookingEventsTable.createdAt), asc(venueBookingEventsTable.id)),
        db.select().from(bookingChangeRequestsTable)
          .where(and(eq(bookingChangeRequestsTable.bookingType, "venue"), eq(bookingChangeRequestsTable.bookingId, booking.id)))
          .orderBy(desc(bookingChangeRequestsTable.createdAt)),
      ]);
      return {
        ...serializeBooking(booking),
        history: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
        changeRequests: requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString(), reviewedAt: request.reviewedAt?.toISOString() ?? null })),
      };
    }));
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to list venue bookings");
    res.status(500).json({ error: "تعذر تحميل حجوزات القاعات" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "يلزم تسجيل الدخول لإرسال طلب الحجز" }); return; }

  const body = req.body as Record<string, unknown>;
  const venueId = Number(body.venueId);
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const bookingDays = Number(body.bookingDays ?? 1);
  const partySize = Number(body.partySize);
  const reservationAt = typeof body.reservationAt === "string" ? new Date(body.reservationAt) : new Date(NaN);
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const paymentType = body.paymentType === "full" ? "full" : body.paymentType === "deposit" ? "deposit" : "";
  const paymentAmount = Number(body.paymentAmount);
  const paymentWalletId = Number(body.paymentWalletId);
  const transactionReference = typeof body.transactionReference === "string" ? body.transactionReference.trim().slice(0, 120) : "";
  const paymentReceiptUrl = typeof body.paymentReceiptUrl === "string" ? body.paymentReceiptUrl.trim() : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";

  if (!Number.isInteger(venueId) || venueId < 1 || !["women", "men"].includes(audience)
    || !Number.isInteger(bookingDays) || bookingDays < 1 || bookingDays > 7
    || !Number.isInteger(partySize) || partySize < 1 || partySize > 1000) {
    res.status(400).json({ error: "تحقق من القاعة والقسم ومدة الحجز وعدد الضيوف" }); return;
  }
  if (!customerName || customerName.length > 200 || !customerPhone || customerPhone.length > 40) {
    res.status(400).json({ error: "يرجى إدخال الاسم ورقم الهاتف" }); return;
  }
  if (!Number.isFinite(reservationAt.getTime()) || reservationAt.getTime() < Date.now() + MIN_LEAD_MS || reservationAt.getTime() > Date.now() + MAX_LEAD_MS) {
    res.status(400).json({ error: "يجب اختيار موعد بعد 30 دقيقة وخلال الأشهر الستة القادمة" }); return;
  }
  if (!paymentType || !Number.isFinite(paymentAmount) || paymentAmount <= PLATFORM_FEE
    || !Number.isInteger(paymentWalletId) || paymentWalletId < 1 || !transactionReference || !paymentReceiptUrl) {
    res.status(400).json({ error: "اختر وسيلة الدفع وأدخل رقم العملية وارفع الإيصال" }); return;
  }
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    res.status(400).json({ error: "مفتاح الطلب مفقود؛ حدّث التطبيق وأعد المحاولة" }); return;
  }
  let receipt: URL;
  try { receipt = new URL(paymentReceiptUrl); } catch { res.status(400).json({ error: "رابط إيصال التحويل غير صحيح" }); return; }
  if (!["http:", "https:"].includes(receipt.protocol) || !receipt.pathname.startsWith("/uploads/receipts/")) {
    res.status(400).json({ error: "يجب رفع صورة الإيصال من داخل التطبيق" }); return;
  }

  const [wallet] = await db.select({ id: paymentWalletsTable.id })
    .from(paymentWalletsTable).where(and(eq(paymentWalletsTable.id, paymentWalletId), eq(paymentWalletsTable.isActive, true)));
  if (!wallet) { res.status(400).json({ error: "وسيلة الدفع المختارة غير مفعلة" }); return; }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [priorRows] = await connection.query<RowDataPacket[]>("SELECT * FROM venue_bookings WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
    if (priorRows[0]) {
      if (Number(priorRows[0].customer_user_id) !== userId) {
        await connection.rollback();
        res.status(409).json({ error: "مفتاح الطلب مستخدم مسبقًا" }); return;
      }
      await connection.commit();
      res.status(200).json(serializeRawBooking(priorRows[0]));
      return;
    }

    const [venueRows] = await connection.query<RowDataPacket[]>("SELECT * FROM venues WHERE id = ? AND is_published = TRUE FOR UPDATE", [venueId]);
    const venue = venueRows[0];
    if (!venue) { await connection.rollback(); res.status(404).json({ error: "القاعة غير منشورة أو غير موجودة" }); return; }
    const [sameKeyRows] = await connection.query<RowDataPacket[]>("SELECT * FROM venue_bookings WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
    if (sameKeyRows[0]) {
      if (Number(sameKeyRows[0].customer_user_id) !== userId) {
        await connection.rollback(); res.status(409).json({ error: "مفتاح الطلب مستخدم مسبقًا" }); return;
      }
      await connection.commit();
      res.status(200).json(serializeRawBooking(sameKeyRows[0]));
      return;
    }
    if (!["both", audience].includes(String(venue.audience_scope))) {
      await connection.rollback(); res.status(400).json({ error: "القسم المختار غير متاح في هذه القاعة" }); return;
    }
    if (!Number.isFinite(Number(venue.daily_price)) || Number(venue.daily_price) <= 0
      || !Number.isInteger(Number(venue.capacity)) || Number(venue.capacity) <= 0
      || partySize > Number(venue.capacity)) {
      await connection.rollback(); res.status(409).json({ error: "بيانات سعر أو سعة القاعة غير مكتملة" }); return;
    }

    const requestedStart = new Date(reservationAt);
    const requestedEnd = new Date(requestedStart);
    requestedEnd.setUTCDate(requestedEnd.getUTCDate() + bookingDays);
    const [conflicts] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM venue_bookings
       WHERE venue_id = ? AND audience = ?
         AND reservation_at < ?
         AND DATE_ADD(reservation_at, INTERVAL booking_days DAY) > ?
         AND (status = 'confirmed' OR (status = 'pending' AND expires_at > UTC_TIMESTAMP()))
       LIMIT 1`,
      [venueId, audience, requestedEnd, requestedStart],
    );
    if (conflicts.length) { await connection.rollback(); res.status(409).json({ error: "أصبح هذا الموعد محجوزًا للقسم المختار؛ اختر يومًا آخر" }); return; }

    const startDate = requestedStart.toISOString().slice(0, 10);
    const endDate = new Date(requestedEnd.getTime() - 86400000).toISOString().slice(0, 10);
    const [blackouts] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM venue_blackouts
       WHERE venue_id = ? AND start_date <= ? AND end_date >= ?
         AND (audience_scope = 'both' OR audience_scope = ?)
       LIMIT 1`,
      [venueId, endDate, startDate, audience],
    );
    if (blackouts.length) { await connection.rollback(); res.status(409).json({ error: "المالك أغلق يومًا ضمن المدة المختارة؛ اختر فترة أخرى" }); return; }

    const dailyPriceSnapshot = Number(venue.daily_price);
    const totalAmount = dailyPriceSnapshot * bookingDays;
    const expectedPayment = (paymentType === "full" ? totalAmount : totalAmount * 0.30) + PLATFORM_FEE;
    if (Math.abs(paymentAmount - expectedPayment) > 0.5) {
      await connection.rollback(); res.status(409).json({ error: "تغير السعر؛ أعد تحميل تفاصيل القاعة قبل الدفع" }); return;
    }
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const [insertResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO venue_bookings
       (venue_id, customer_user_id, audience, reservation_at, booking_days, party_size, customer_name, customer_phone,
        daily_price_snapshot, total_amount, payment_type, payment_amount, platform_fee, payment_wallet_id,
        transaction_reference, payment_receipt_url, payment_status, status, idempotency_key, expires_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'pending', ?, ?, ?)`,
      [venueId, userId, audience, reservationAt, bookingDays, partySize, customerName, customerPhone,
        dailyPriceSnapshot, totalAmount, paymentType, expectedPayment, PLATFORM_FEE, paymentWalletId,
        transactionReference, paymentReceiptUrl, idempotencyKey, expiresAt, notes || null],
    );
    const bookingId = Number(insertResult.insertId);
    await connection.query(
      "INSERT INTO venue_booking_events (booking_id, actor_user_id, actor_type, event_type, to_status, notes) VALUES (?, ?, 'customer', 'booking_created', 'pending', ?)",
      [bookingId, userId, `طلب حجز ${bookingDays} يوم للقسم ${audience}`],
    );
    const [savedRows] = await connection.query<RowDataPacket[]>("SELECT * FROM venue_bookings WHERE id = ?", [bookingId]);
    const row = savedRows[0];
    await connection.commit();
    const [ownerRows] = await pool.query<RowDataPacket[]>(
      "SELECT vo.user_id FROM venues v INNER JOIN venue_owners vo ON vo.id = v.owner_id WHERE v.id = ? LIMIT 1", [venueId],
    );
    const ownerUserId = Number(ownerRows[0]?.user_id || 0);
    if (ownerUserId > 0) await createPartnerNotification({
      recipientUserId: ownerUserId,
      bookingType: "venue",
      bookingId,
      type: "venue_booking_created",
      title: "طلب حجز قاعة جديد",
      message: `وصل طلب حجز جديد رقم ${bookingId}، راجع المدة والقسم وإيصال الدفع.`,
    }).catch((error) => req.log.warn({ error, bookingId }, "Partner venue booking notification failed"));
    await createCustomerNotification({
      sessionId: String(userId),
      type: "venue_booking_received",
      title: "تم استلام طلب حجز القاعة",
      message: `تم استلام طلب حجز القاعة رقم ${bookingId}، وسيصلك إشعار عند تحديثه.`,
      customerName,
      phone: customerPhone,
    }).catch((error) => req.log.warn({ error, bookingId }, "Customer venue booking notification failed"));
    res.status(201).json(serializeRawBooking(row));
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error }, "Failed to create venue booking");
    res.status(500).json({ error: "تعذر إرسال طلب حجز القاعة" });
  } finally {
    connection.release();
  }
});

router.post("/:id/cancellation-requests", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول أولًا" }); return; }
  res.status(403).json({ error: "طلبات إلغاء القاعات غير متاحة حاليًا؛ ستُعتمد شروطها لاحقًا من لوحة التحكم." });
});

export default router;
