import { Router, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, venueOwnersTable, venuesTable, venueBookingsTable, venueBookingEventsTable, venueBlackoutsTable, venueAvailabilityTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";
import { createCustomerNotification } from "../lib/notifications";

const router = Router();
const AUDIENCES = ["women", "men", "both"] as const;
type AudienceScope = (typeof AUDIENCES)[number];

function jsonList(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 40));
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? JSON.stringify(parsed.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 40)) : "[]";
    } catch { return "[]"; }
  }
  return "[]";
}

function venueReady(data: {
  nameAr: string; city: string; address: string; capacity: number; dailyPrice: number;
  audienceScope: string; primaryImageUrl: string; isPublished: boolean;
}): boolean {
  let validImageUrl = false;
  try { const url = new URL(data.primaryImageUrl); validImageUrl = ["http:", "https:"].includes(url.protocol); } catch { validImageUrl = false; }
  return Boolean(data.nameAr.trim() && data.city.trim() && data.address.trim() && validImageUrl)
    && Number.isInteger(data.capacity) && data.capacity > 0
    && Number.isFinite(data.dailyPrice) && data.dailyPrice > 0
    && AUDIENCES.includes(data.audienceScope as AudienceScope)
    && data.isPublished;
}

async function getOwner(req: Request, res: Response) {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك أولًا" }); return null; }
  const [owner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
  if (!owner || owner.status !== "active") {
    res.status(403).json({ error: owner?.status === "pending" ? "طلب الشراكة بانتظار اعتماد الإدارة" : "حساب الشريك غير مفعّل" });
    return null;
  }
  return owner;
}

router.post("/owner-request", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "سجّل الدخول لإرسال طلب الشراكة" }); return; }
    const businessName = typeof req.body?.businessName === "string" ? req.body.businessName.trim().slice(0, 180) : "";
    const contactPhone = typeof req.body?.contactPhone === "string" ? req.body.contactPhone.trim().slice(0, 40) : "";
    if (!businessName || !contactPhone) { res.status(400).json({ error: "أدخل اسم النشاط ورقم التواصل" }); return; }
    const [existing] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
    if (existing) { res.status(200).json(existing); return; }
    await db.insert(venueOwnersTable).values({ userId, businessName, contactPhone, status: "pending" });
    const [created] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
    res.status(201).json(created);
  } catch (error) {
    req.log.error({ error }, "Venue owner request failed");
    res.status(500).json({ error: "تعذر إرسال طلب الشراكة" });
  }
});

router.get("/me", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "سجّل الدخول أولًا" }); return; }
    const [owner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
    if (!owner) { if (!res.headersSent) res.json({ owner: null, venues: [] }); return; }
    const venues = owner.status === "active" ? await db.select().from(venuesTable).where(eq(venuesTable.ownerId, owner.id)) : [];
    res.setHeader("Cache-Control", "no-store");
    res.json({ owner, venues });
  } catch (error) {
    req.log.error({ error }, "Venue partner profile failed");
    res.status(500).json({ error: "تعذر تحميل حساب الشريك" });
  }
});

router.get("/venues", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venues = await db.select().from(venuesTable).where(eq(venuesTable.ownerId, owner.id)).orderBy(desc(venuesTable.id));
    res.setHeader("Cache-Control", "no-store");
    res.json(venues);
  } catch (error) {
    req.log.error({ error }, "Partner list venues failed");
    res.status(500).json({ error: "تعذر تحميل القاعات" });
  }
});

router.post("/venues", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const body = req.body as Record<string, unknown>;
    const nameAr = typeof body.nameAr === "string" ? body.nameAr.trim().slice(0, 180) : "";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 120) : "";
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 500) : "";
    const audienceScope = typeof body.audienceScope === "string" ? body.audienceScope : "";
    const capacity = Number(body.capacity);
    const dailyPrice = Number(body.dailyPrice);
    const primaryImageUrl = typeof body.primaryImageUrl === "string" ? body.primaryImageUrl.trim().slice(0, 2000) : "";
    const shouldPublish = body.isPublished === true;
    const inputSlots = Array.isArray(body.slots) ? body.slots as Array<Record<string, unknown>> : [];
    if (inputSlots.length > 21 || inputSlots.some((slot) => typeof slot.isOpen !== "boolean")) {
      res.status(400).json({ error: "جدول الدوام الأسبوعي غير صحيح" }); return;
    }
    const validScopes = audienceScope === "both" ? ["both", "women", "men"] : [audienceScope];
    const slots = inputSlots.map((slot) => ({ audienceScope: String(slot.audienceScope || ""), weekDay: Number(slot.weekDay), isOpen: slot.isOpen === true }));
    const slotKeys = new Set<string>();
    for (const slot of slots) {
      const key = `${slot.audienceScope}:${slot.weekDay}`;
      if (!validScopes.includes(slot.audienceScope) || !Number.isInteger(slot.weekDay) || slot.weekDay < 0 || slot.weekDay > 6 || slotKeys.has(key)) {
        res.status(400).json({ error: "تحقق من القسم واليوم في جدول الدوام" }); return;
      }
      slotKeys.add(key);
    }
    if (!nameAr || !city || !address || !Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(dailyPrice) || dailyPrice <= 0 || !AUDIENCES.includes(audienceScope as AudienceScope)) {
      res.status(400).json({ error: "أدخل اسم القاعة وموقعها وسعتها وسعرها اليومي ونطاقها بشكل صحيح" }); return;
    }
    if (shouldPublish && (!venueReady({ nameAr, city, address, capacity, dailyPrice, primaryImageUrl, audienceScope, isPublished: true }) || !slots.some((slot) => slot.isOpen))) {
      res.status(400).json({ error: "أكمل رابط الصورة والبيانات وحدد يوم دوام مفتوحًا قبل النشر" }); return;
    }
    const venue = await db.transaction(async (tx) => {
      const [result] = await tx.insert(venuesTable).values({
        ownerId: owner.id,
        nameAr,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 4000) : null,
        city,
        address,
        capacity,
        dailyPrice,
        audienceScope,
        primaryImageUrl,
        images: jsonList(body.images),
        amenities: jsonList(body.amenities),
        rules: typeof body.rules === "string" ? body.rules.trim().slice(0, 4000) : null,
        isPublished: shouldPublish,
      });
      const id = Number(result.insertId);
      if (slots.length) await tx.insert(venueAvailabilityTable).values(slots.map((slot) => ({ venueId: id, audienceScope: slot.audienceScope, weekDay: slot.weekDay, period: "all_day", isOpen: slot.isOpen })));
      const [created] = await tx.select().from(venuesTable).where(eq(venuesTable.id, id));
      return created;
    });
    res.status(201).json(venue);
  } catch (error) {
    req.log.error({ error }, "Partner create venue failed");
    res.status(500).json({ error: "تعذر حفظ بيانات القاعة" });
  }
});

router.patch("/venues/:id", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const id = Number.parseInt(req.params.id, 10);
    const [existing] = await db.select().from(venuesTable).where(and(eq(venuesTable.id, id), eq(venuesTable.ownerId, owner.id)));
    if (!existing) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    const body = req.body as Record<string, unknown>;
    const updates: Partial<typeof venuesTable.$inferInsert> = {};
    if (typeof body.nameAr === "string") updates.nameAr = body.nameAr.trim().slice(0, 180);
    if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 4000);
    if (typeof body.city === "string") updates.city = body.city.trim().slice(0, 120);
    if (typeof body.address === "string") updates.address = body.address.trim().slice(0, 500);
    if (body.capacity !== undefined) updates.capacity = Number(body.capacity);
    if (body.dailyPrice !== undefined) updates.dailyPrice = Number(body.dailyPrice);
    if (typeof body.audienceScope === "string") updates.audienceScope = body.audienceScope;
    if (typeof body.primaryImageUrl === "string") updates.primaryImageUrl = body.primaryImageUrl.trim().slice(0, 2000);
    if (body.images !== undefined) updates.images = jsonList(body.images);
    if (body.amenities !== undefined) updates.amenities = jsonList(body.amenities);
    if (typeof body.rules === "string") updates.rules = body.rules.trim().slice(0, 4000);
    const next = { ...existing, ...updates };
    if (body.isPublished === true && !venueReady({ ...next, isPublished: true })) {
      res.status(400).json({ error: "لا يمكن نشر القاعة قبل استكمال السعر والسعة والتصنيف والعنوان والصورة الفعلية" }); return;
    }
    if (body.isPublished === true) {
      const schedule = await db.select({ isOpen: venueAvailabilityTable.isOpen }).from(venueAvailabilityTable).where(eq(venueAvailabilityTable.venueId, id));
      if (!schedule.some((slot) => slot.isOpen)) { res.status(400).json({ error: "حدد أيام الدوام الأسبوعي المفتوحة قبل نشر القاعة" }); return; }
    }
    if (body.isPublished === true || body.isPublished === false) updates.isPublished = body.isPublished;
    updates.updatedAt = new Date();
    await db.update(venuesTable).set(updates).where(eq(venuesTable.id, id));
    const [updated] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
    res.json(updated);
  } catch (error) {
    req.log.error({ error }, "Partner update venue failed");
    res.status(500).json({ error: "تعذر تحديث بيانات القاعة" });
  }
});

router.get("/venues/:id/availability", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const [venue] = await db.select({ id: venuesTable.id }).from(venuesTable).where(and(eq(venuesTable.id, venueId), eq(venuesTable.ownerId, owner.id)));
    if (!venue) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    res.json(await db.select().from(venueAvailabilityTable).where(eq(venueAvailabilityTable.venueId, venueId)));
  } catch (error) {
    req.log.error({ error }, "Partner load venue availability failed");
    res.status(500).json({ error: "تعذر تحميل جدول الدوام" });
  }
});

router.put("/venues/:id/availability", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const [venue] = await db.select().from(venuesTable).where(and(eq(venuesTable.id, venueId), eq(venuesTable.ownerId, owner.id)));
    if (!venue) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    const input = Array.isArray(req.body?.slots) ? req.body.slots as Array<Record<string, unknown>> : null;
    if (!input || input.length > 21 || input.some((slot) => typeof slot.isOpen !== "boolean")) { res.status(400).json({ error: "أرسل جدولًا أسبوعيًا صحيحًا" }); return; }
    const slots = input.map((slot) => ({
      audienceScope: String(slot.audienceScope || ""),
      weekDay: Number(slot.weekDay),
      isOpen: slot.isOpen === true,
    }));
    const validScopes = venue.audienceScope === "both" ? ["both", "women", "men"] : [venue.audienceScope];
    const uniqueKeys = new Set<string>();
    for (const slot of slots) {
      const key = `${slot.audienceScope}:${slot.weekDay}`;
      if (!validScopes.includes(slot.audienceScope) || !Number.isInteger(slot.weekDay) || slot.weekDay < 0 || slot.weekDay > 6 || uniqueKeys.has(key)) {
        res.status(400).json({ error: "تحقق من نطاق القسم واليوم؛ يجب أن يكون كل يوم وقسم مرة واحدة" }); return;
      }
      uniqueKeys.add(key);
    }

    const activeBookings = await db.select({
      audience: venueBookingsTable.audience,
      reservationAt: venueBookingsTable.reservationAt,
      bookingDays: venueBookingsTable.bookingDays,
      status: venueBookingsTable.status,
      expiresAt: venueBookingsTable.expiresAt,
    }).from(venueBookingsTable).where(eq(venueBookingsTable.venueId, venueId));
    const now = Date.now();
    for (const booking of activeBookings) {
      if (booking.status !== "confirmed" && !(booking.status === "pending" && booking.expiresAt && booking.expiresAt.getTime() > now)) continue;
      const days = Math.min(7, Math.max(1, booking.bookingDays));
      for (let offset = 0; offset < days; offset += 1) {
        const day = new Date(booking.reservationAt);
        day.setDate(day.getDate() + offset);
        const weekday = day.getDay();
        const exact = slots.filter((slot) => slot.weekDay === weekday && slot.audienceScope === booking.audience);
        const shared = slots.filter((slot) => slot.weekDay === weekday && slot.audienceScope === "both");
        const effective = exact.length ? exact : shared;
        if (!effective.some((slot) => slot.isOpen)) {
          res.status(409).json({ error: "لا يمكن إغلاق يوم يشمله حجز مؤكد أو حجز مؤقت نشط" }); return;
        }
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(venueAvailabilityTable).where(eq(venueAvailabilityTable.venueId, venueId));
      if (slots.length) await tx.insert(venueAvailabilityTable).values(slots.map((slot) => ({ venueId, audienceScope: slot.audienceScope, weekDay: slot.weekDay, period: "all_day", isOpen: slot.isOpen })));
    });
    res.json({ venueId, slots });
  } catch (error) {
    req.log.error({ error }, "Partner save venue availability failed");
    res.status(500).json({ error: "تعذر حفظ جدول الدوام" });
  }
});

router.get("/bookings", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const ownedVenues = await db.select({ id: venuesTable.id }).from(venuesTable).where(eq(venuesTable.ownerId, owner.id));
    if (ownedVenues.length === 0) { res.json([]); return; }
    const ids = ownedVenues.map((venue) => venue.id);
    const bookings = await db.select().from(venueBookingsTable).where(inArray(venueBookingsTable.venueId, ids)).orderBy(desc(venueBookingsTable.reservationAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(bookings.map((row) => ({ ...row, reservationAt: row.reservationAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    req.log.error({ error }, "Partner list bookings failed");
    res.status(500).json({ error: "تعذر تحميل الحجوزات" });
  }
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const id = Number.parseInt(req.params.id, 10);
    const status = req.body?.status;
    if (!Number.isInteger(id) || id < 1 || !["confirmed", "rejected", "cancelled"].includes(status)) {
      res.status(400).json({ error: "حالة الحجز غير صحيحة" }); return;
    }
    const [row] = await db.select({ booking: venueBookingsTable, venueOwnerId: venuesTable.ownerId, venueName: venuesTable.nameAr })
      .from(venueBookingsTable).innerJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
      .where(eq(venueBookingsTable.id, id));
    if (!row || row.venueOwnerId !== owner.id) { res.status(404).json({ error: "الحجز غير موجود ضمن قاعاتك" }); return; }
    if (status === "confirmed" && (row.booking.status !== "pending" || !row.booking.expiresAt || row.booking.expiresAt.getTime() <= Date.now())) {
      res.status(409).json({ error: "انتهت مهلة الحجز؛ لا يمكن تأكيده بعد انتهاء الحجز المؤقت" }); return;
    }
    await db.update(venueBookingsTable).set({
      status,
      expiresAt: null,
      paymentStatus: status === "confirmed" ? "approved" : status === "rejected" ? "rejected" : row.booking.paymentStatus,
    }).where(eq(venueBookingsTable.id, id));
    await db.insert(venueBookingEventsTable).values({ bookingId: id, actorUserId: owner.userId, actorType: "venue_owner", eventType: "status_changed", fromStatus: row.booking.status, toStatus: status });
    if (["confirmed", "rejected", "cancelled"].includes(status)) {
      await createCustomerNotification({
        sessionId: String(row.booking.customerUserId),
        type: "venue_reservation_status",
        title: status === "confirmed" ? "تم قبول حجز القاعة" : status === "rejected" ? "تم رفض حجز القاعة" : "تم إلغاء حجز القاعة",
        message: status === "confirmed" ? `تم قبول حجز ${row.venueName}.` : status === "rejected" ? `لم يتم قبول حجز ${row.venueName}.` : `تم إلغاء حجز ${row.venueName}.`,
        customerName: row.booking.customerName,
        phone: row.booking.customerPhone,
      });
    }
    res.json({ id, status });
  } catch (error) {
    req.log.error({ error }, "Partner update booking failed");
    res.status(500).json({ error: "تعذر تحديث الحجز" });
  }
});

router.post("/venues/:id/blackouts", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const [venue] = await db.select({ id: venuesTable.id }).from(venuesTable).where(and(eq(venuesTable.id, venueId), eq(venuesTable.ownerId, owner.id)));
    if (!venue) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    const startDate = String(req.body?.startDate || "");
    const endDate = String(req.body?.endDate || "");
    const audienceScope = String(req.body?.audienceScope || "both");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate || !AUDIENCES.includes(audienceScope as AudienceScope)) {
      res.status(400).json({ error: "أدخل تاريخ البداية والنهاية ونطاق القسم بشكل صحيح" }); return;
    }
    const [result] = await db.insert(venueBlackoutsTable).values({
      venueId, audienceScope, startDate, endDate,
      reason: typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : null,
      createdByUserId: owner.userId,
    });
    res.status(201).json({ id: Number(result.insertId), venueId, audienceScope, startDate, endDate });
  } catch (error) {
    req.log.error({ error }, "Partner blackout create failed");
    res.status(500).json({ error: "تعذر إغلاق الأيام" });
  }
});

export default router;
