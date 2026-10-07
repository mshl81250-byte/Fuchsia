import { Router } from "express";
import { db, storesTable, tableReservationsTable } from "@workspace/db";
import { and, eq, gte, lt, or, like } from "drizzle-orm";

const router = Router();

function serializeVenue(store: typeof storesTable.$inferSelect) {
  return {
    id: store.id,
    nameAr: store.nameAr,
    descriptionAr: store.description ?? "قاعة مناسبة فاخرة لمناسباتك الجميلة.",
    imageUrl: store.coverUrl || store.logoUrl,
    address: store.location || "صنعاء، اليمن",
    city: (store.location || "صنعاء").split("،").pop()?.trim() || "صنعاء",
    capacity: 300,
    priceFrom: 250000,
    rating: store.rating,
    reviewCount: store.reviewCount,
    amenities: ["قاعة مكيفة", "مواقف سيارات", "تجهيزات مناسبات"],
    rules: "يُثبت الموعد بعد مراجعة الطلب والتأكد من الدفع. يمنع إلغاء الحجز قبل 72 ساعة من الموعد.",
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const search = String(req.query.search || "").trim();
    const rows = search
      ? await db.select().from(storesTable).where(or(like(storesTable.nameAr, `%${search}%`), like(storesTable.location, `%${search}%`))).orderBy(storesTable.id)
      : await db.select().from(storesTable).orderBy(storesTable.id);
    res.json(rows.map(serializeVenue));
  } catch (err) {
    req.log.error({ err }, "Failed to list venues");
    res.status(500).json({ error: "تعذر تحميل القاعات" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, id));
    if (!store) { res.status(404).json({ error: "القاعة غير موجودة" }); return; }
    res.json(serializeVenue(store));
  } catch (err) {
    req.log.error({ err }, "Failed to get venue");
    res.status(500).json({ error: "تعذر تحميل تفاصيل القاعة" });
  }
});

router.get("/:id/availability", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const month = String(req.query.month || "");
    if (!/^\d{4}-\d{2}$/.test(month)) { res.status(400).json({ error: "month يجب أن يكون بصيغة YYYY-MM" }); return; }
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.id, id));
    if (!store) { res.status(404).json({ error: "القاعة غير موجودة" }); return; }
    const rows = await db.select({ date: tableReservationsTable.reservationAt, status: tableReservationsTable.status })
      .from(tableReservationsTable)
      .where(and(eq(tableReservationsTable.storeId, id), gte(tableReservationsTable.reservationAt, start), lt(tableReservationsTable.reservationAt, end)));
    const booked = rows.filter(row => !["cancelled", "rejected"].includes(row.status)).map(row => row.date.toISOString().slice(0, 10));
    res.json({ venueId: id, month, booked: [...new Set(booked)] });
  } catch (err) {
    req.log.error({ err }, "Failed to load venue availability");
    res.status(500).json({ error: "تعذر تحميل تقويم التوفر" });
  }
});

export default router;
