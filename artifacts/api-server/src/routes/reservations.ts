import { Router } from "express";
import { db, storesTable, tableReservationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

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
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
    if (!sessionId) {
      res.status(400).json({ error: "معرّف الجلسة مطلوب" });
      return;
    }
    const rows = await db.select().from(tableReservationsTable)
      .where(eq(tableReservationsTable.sessionId, sessionId))
      .orderBy(desc(tableReservationsTable.reservationAt));
    res.json(rows.map(serializeReservation));
  } catch (error) {
    req.log.error({ error }, "Failed to list table reservations");
    res.status(500).json({ error: "تعذر تحميل طلبات الحجز" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const occasion = typeof body.occasion === "string" ? body.occasion.trim().slice(0, 120) : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const storeId = Number(body.storeId);
    const partySize = Number(body.partySize);
    const reservationAt = typeof body.reservationAt === "string" ? new Date(body.reservationAt) : new Date(NaN);

    if (!sessionId || sessionId.length > 200 || !customerName || customerName.length > 200 || !customerPhone || customerPhone.length > 40) {
      res.status(400).json({ error: "يرجى إدخال الاسم ورقم الهاتف وبيانات الجلسة" });
      return;
    }
    if (!Number.isInteger(storeId) || storeId < 1 || !Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      res.status(400).json({ error: "يرجى اختيار الفرع وتحديد عدد الضيوف (من 1 إلى 20)" });
      return;
    }
    if (Number.isNaN(reservationAt.getTime()) || reservationAt.getTime() < Date.now() + MIN_LEAD_MS || reservationAt.getTime() > Date.now() + MAX_LEAD_MS) {
      res.status(400).json({ error: "يجب اختيار موعد بعد 30 دقيقة وخلال الأشهر الستة القادمة" });
      return;
    }

    const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.id, storeId));
    if (!store) {
      res.status(404).json({ error: "الفرع المختار غير موجود" });
      return;
    }

    const userIdValue = Number(body.userId);
    const userId = Number.isInteger(userIdValue) && userIdValue > 0 ? userIdValue : null;
    const [insertResult] = await db.insert(tableReservationsTable).values({
      sessionId,
      userId,
      storeId,
      reservationAt,
      partySize,
      customerName,
      customerPhone,
      occasion: occasion || null,
      notes: notes || null,
      status: "pending",
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
