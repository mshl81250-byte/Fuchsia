import { Router } from "express";
import { and, eq, gte, gt, lt, or, like } from "drizzle-orm";
import { db, venuesTable, venueBookingsTable, venueBlackoutsTable, venueAvailabilityTable } from "@workspace/db";

const router = Router();
const allowedAudiences = ["women", "men"] as const;
type Audience = (typeof allowedAudiences)[number];

function parseList(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function isVenueReady(venue: typeof venuesTable.$inferSelect): boolean {
  return venue.isPublished
    && Number.isFinite(venue.dailyPrice) && venue.dailyPrice > 0
    && Number.isInteger(venue.capacity) && venue.capacity > 0
    && ["women", "men", "both"].includes(venue.audienceScope)
    && Boolean(venue.city.trim())
    && Boolean(venue.address.trim())
    && Boolean(venue.primaryImageUrl.trim());
}

function serializeVenue(venue: typeof venuesTable.$inferSelect) {
  return {
    id: venue.id,
    venueAudience: venue.audienceScope,
    nameAr: venue.nameAr,
    descriptionAr: venue.description || "",
    imageUrl: venue.primaryImageUrl,
    images: parseList(venue.images),
    address: venue.address,
    city: venue.city,
    capacity: venue.capacity,
    priceFrom: venue.dailyPrice,
    rating: venue.rating,
    reviewCount: venue.reviewCount,
    amenities: parseList(venue.amenities),
    rules: venue.rules || "",
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const search = String(req.query.search || "").trim();
    const audience = String(req.query.audience || "").trim();
    if (audience && !allowedAudiences.includes(audience as Audience)) {
      res.status(400).json({ error: "audience يجب أن يكون women أو men" });
      return;
    }
    const conditions = [eq(venuesTable.isPublished, true)];
    if (search) conditions.push(or(
      like(venuesTable.nameAr, `%${search}%`),
      like(venuesTable.city, `%${search}%`),
      like(venuesTable.address, `%${search}%`),
    )!);
    if (audience) conditions.push(or(eq(venuesTable.audienceScope, "both"), eq(venuesTable.audienceScope, audience))!);
    const rows = await db.select().from(venuesTable).where(and(...conditions)).orderBy(venuesTable.id).limit(100);
    res.json(rows.filter(isVenueReady).map(serializeVenue));
  } catch (err) {
    req.log.error({ err }, "Failed to list venues");
    res.status(500).json({ error: "تعذر تحميل القاعات" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "رقم القاعة غير صحيح" }); return; }
    const [venue] = await db.select().from(venuesTable).where(and(eq(venuesTable.id, id), eq(venuesTable.isPublished, true)));
    if (!venue || !isVenueReady(venue)) { res.status(404).json({ error: "القاعة غير منشورة أو بياناتها غير مكتملة" }); return; }
    res.json(serializeVenue(venue));
  } catch (err) {
    req.log.error({ err }, "Failed to get venue");
    res.status(500).json({ error: "تعذر تحميل تفاصيل القاعة" });
  }
});

router.get("/:id/availability", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const month = String(req.query.month || "");
    const audience = String(req.query.audience || "").trim();
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "رقم القاعة غير صحيح" }); return; }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { res.status(400).json({ error: "month يجب أن يكون بصيغة YYYY-MM" }); return; }
    if (audience && !allowedAudiences.includes(audience as Audience)) { res.status(400).json({ error: "اختر قسم النساء أو الرجال" }); return; }

    const [venue] = await db.select().from(venuesTable).where(and(eq(venuesTable.id, id), eq(venuesTable.isPublished, true)));
    if (!venue || !isVenueReady(venue)) { res.status(404).json({ error: "القاعة غير منشورة أو بياناتها غير مكتملة" }); return; }
    if (audience && venue.audienceScope !== "both" && venue.audienceScope !== audience) {
      res.status(400).json({ error: "القسم المطلوب غير متاح في هذه القاعة" });
      return;
    }

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    const queryStart = new Date(monthStart);
    queryStart.setUTCDate(queryStart.getUTCDate() - 7);
    const bookingRows = await db.select({
      date: venueBookingsTable.reservationAt,
      days: venueBookingsTable.bookingDays,
      audience: venueBookingsTable.audience,
      status: venueBookingsTable.status,
    }).from(venueBookingsTable).where(and(
      eq(venueBookingsTable.venueId, id),
      gte(venueBookingsTable.reservationAt, queryStart),
      lt(venueBookingsTable.reservationAt, monthEnd),
      or(
        eq(venueBookingsTable.status, "confirmed"),
        and(eq(venueBookingsTable.status, "pending"), gt(venueBookingsTable.expiresAt, new Date())),
      ),
    ));
    const blackoutRows = await db.select({
      startDate: venueBlackoutsTable.startDate,
      endDate: venueBlackoutsTable.endDate,
      audienceScope: venueBlackoutsTable.audienceScope,
    }).from(venueBlackoutsTable).where(and(
      eq(venueBlackoutsTable.venueId, id),
      lt(venueBlackoutsTable.startDate, monthEnd.toISOString().slice(0, 10)),
      gte(venueBlackoutsTable.endDate, monthStart.toISOString().slice(0, 10)),
    ));
    const scheduleRows = await db.select().from(venueAvailabilityTable).where(eq(venueAvailabilityTable.venueId, id));

    const booked = new Set<string>();
    const closed = new Set<string>();
    const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const day = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), dayNumber));
      const key = day.toISOString().slice(0, 10);
      const applicable = scheduleRows.filter((row) => row.weekDay === day.getUTCDay()
        && row.period === "all_day"
        && (audience ? row.audienceScope === audience || row.audienceScope === "both" : row.audienceScope === "both"));
      const specific = audience ? applicable.filter((row) => row.audienceScope === audience) : [];
      const effectiveRows = specific.length ? specific : applicable.filter((row) => row.audienceScope === "both");
      if (!effectiveRows.some((row) => row.isOpen)) closed.add(key);
    }
    for (const row of bookingRows) {
      if (audience && row.audience !== audience) continue;
      const startDate = new Date(`${row.date.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const duration = Math.max(1, Math.min(7, row.days || 1));
      for (let offset = 0; offset < duration; offset += 1) {
        const day = new Date(startDate);
        day.setUTCDate(day.getUTCDate() + offset);
        const key = day.toISOString().slice(0, 10);
        if (key.startsWith(`${month}-`)) booked.add(key);
      }
    }
    for (const row of blackoutRows) {
      if (audience && row.audienceScope !== "both" && row.audienceScope !== audience) continue;
      const startDate = new Date(`${row.startDate}T00:00:00.000Z`);
      const endDate = new Date(`${row.endDate}T00:00:00.000Z`);
      for (const day = new Date(startDate); day <= endDate; day.setUTCDate(day.getUTCDate() + 1)) {
        const key = day.toISOString().slice(0, 10);
        if (key.startsWith(`${month}-`)) booked.add(key);
      }
    }
    res.json({ venueId: id, month, audience: audience || "both", booked: [...booked].sort(), closed: [...closed].sort() });
  } catch (err) {
    req.log.error({ err }, "Failed to load venue availability");
    res.status(500).json({ error: "تعذر تحميل تقويم التوفر" });
  }
});

export default router;
