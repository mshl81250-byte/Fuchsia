import { Router, type Request, type Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { and, desc, eq, gt, gte, inArray, lt, or } from "drizzle-orm";
import { db, pool, storesTable, usersTable, venueOwnersTable, venuesTable, venueBookingsTable, venueBookingEventsTable, venueBlackoutsTable, venueAvailabilityTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";
import { createCustomerNotification, createPartnerNotification } from "../lib/notifications";
import { canManageVenueBookings, visibleVenueBookingsPermission } from "../lib/venue-partner-permissions";
import { paymentStatusForVenueBooking, validateVenueBookingTransition, VENUE_BOOKING_STATUSES } from "../lib/venue-booking-lifecycle";

const router = Router();
const AUDIENCES = ["women", "men", "both"] as const;
type AudienceScope = (typeof AUDIENCES)[number];

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

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
  if (!userId) { res.status(401).json({ code: "AUTH_REQUIRED", error: "سجّل الدخول بحسابك أولًا" }); return null; }
  const [account] = await db.select({ accountType: usersTable.accountType, partnerPermissions: usersTable.partnerPermissions }).from(usersTable).where(eq(usersTable.id, userId));
  const [owner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
  if (!owner || owner.status !== "active") {
    res.status(403).json({ code: owner?.status === "pending" ? "VENUE_OWNER_PENDING" : "VENUE_OWNER_INACTIVE", error: owner?.status === "pending" ? "طلب الشراكة بانتظار اعتماد الإدارة" : "حساب الشريك غير مفعّل" });
    return null;
  }
  if (!canManageVenueBookings(account?.accountType, account?.partnerPermissions, owner.status)) {
    res.status(403).json({ code: "VENUE_ACCESS_DENIED", error: "حسابك غير مخول لإدارة حجوزات القاعات" }); return null;
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
    const [user] = await db.select({ fullName: usersTable.fullName, accountType: usersTable.accountType, partnerPermissions: usersTable.partnerPermissions }).from(usersTable).where(eq(usersTable.id, userId));
    let permissions = {
      products: user?.accountType === "partner",
      rentals: user?.accountType === "partner",
      venueBookings: visibleVenueBookingsPermission(user?.accountType, user?.partnerPermissions, owner?.status),
    };
    try {
      permissions = {
        ...permissions,
        ...(JSON.parse(user?.partnerPermissions || "{}") as Partial<typeof permissions>),
        venueBookings: visibleVenueBookingsPermission(user?.accountType, user?.partnerPermissions, owner?.status),
      };
    } catch { /* use safe defaults */ }
    const rentalStores = await db.select({ id: storesTable.id, nameAr: storesTable.nameAr, logoUrl: storesTable.logoUrl, isOpen: storesTable.isOpen })
      .from(storesTable).where(eq(storesTable.ownerUserId, userId));
    if (!owner) { res.setHeader("Cache-Control", "no-store"); res.json({ owner: null, venues: [], rentalStores, account: { fullName: user?.fullName || "", accountType: user?.accountType || "customer", permissions } }); return; }
    const venues = owner.status === "active" ? await db.select().from(venuesTable).where(eq(venuesTable.ownerId, owner.id)) : [];
    res.setHeader("Cache-Control", "no-store");
    res.json({ owner, venues, rentalStores, account: { fullName: user?.fullName || "", accountType: user?.accountType || "customer", permissions } });
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

router.get("/venues/:id/calendar", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const month = String(req.query.month || "");
    const audience = String(req.query.audience || "");
    if (!Number.isInteger(venueId) || venueId < 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      || !["women", "men"].includes(audience)) {
      res.status(400).json({ error: "اختر القاعة والشهر والقسم بشكل صحيح" }); return;
    }
    const [venue] = await db.select({ id: venuesTable.id, audienceScope: venuesTable.audienceScope })
      .from(venuesTable).where(and(eq(venuesTable.id, venueId), eq(venuesTable.ownerId, owner.id)));
    if (!venue) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    if (venue.audienceScope !== "both" && venue.audienceScope !== audience) {
      res.status(400).json({ error: "القسم المختار غير متاح في هذه القاعة" }); return;
    }
    const [year, monthNumber] = month.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
    const queryStart = new Date(monthStart);
    queryStart.setUTCDate(queryStart.getUTCDate() - 7);
    const bookingRows = await db.select({
      date: venueBookingsTable.reservationAt,
      days: venueBookingsTable.bookingDays,
      audience: venueBookingsTable.audience,
      status: venueBookingsTable.status,
    }).from(venueBookingsTable).where(and(
      eq(venueBookingsTable.venueId, venueId),
      gte(venueBookingsTable.reservationAt, queryStart),
      lt(venueBookingsTable.reservationAt, monthEnd),
      or(
        eq(venueBookingsTable.status, "confirmed"),
        and(eq(venueBookingsTable.status, "pending"), gt(venueBookingsTable.expiresAt, new Date())),
      ),
    ));
    const scheduleRows = await db.select().from(venueAvailabilityTable).where(eq(venueAvailabilityTable.venueId, venueId));
    const booked = new Set<string>();
    const closed = new Set<string>();
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const day = new Date(Date.UTC(year, monthNumber - 1, dayNumber));
      const key = day.toISOString().slice(0, 10);
      const applicable = scheduleRows.filter((row) => row.weekDay === day.getUTCDay()
        && row.period === "all_day"
        && (row.audienceScope === audience || row.audienceScope === "both"));
      const specific = applicable.filter((row) => row.audienceScope === audience);
      const effective = specific.length ? specific : applicable.filter((row) => row.audienceScope === "both");
      if (!effective.some((row) => row.isOpen)) closed.add(key);
    }
    for (const row of bookingRows) {
      if (row.audience !== audience) continue;
      const startDate = new Date(`${row.date.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const duration = Math.max(1, Math.min(7, row.days || 1));
      for (let offset = 0; offset < duration; offset += 1) {
        const day = new Date(startDate);
        day.setUTCDate(day.getUTCDate() + offset);
        const key = day.toISOString().slice(0, 10);
        if (key.startsWith(`${month}-`)) booked.add(key);
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ venueId, month, audience, booked: [...booked].sort(), closed: [...closed].sort() });
  } catch (error) {
    req.log.error({ error }, "Partner calendar load failed");
    res.status(500).json({ error: "تعذر تحميل تقويم القاعة" });
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
    res.json(bookings.map((row) => ({
      ...row,
      reservationAt: row.reservationAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })));
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
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!Number.isInteger(id) || id < 1 || !VENUE_BOOKING_STATUSES.includes(status)) {
      res.status(400).json({ code: "INVALID_STATUS", error: "حالة الحجز غير صحيحة" }); return;
    }
    const [row] = await db.select({ booking: venueBookingsTable, venueOwnerId: venuesTable.ownerId, venueName: venuesTable.nameAr })
      .from(venueBookingsTable).innerJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
      .where(eq(venueBookingsTable.id, id));
    if (!row || row.venueOwnerId !== owner.id) { res.status(404).json({ error: "الحجز غير موجود ضمن قاعاتك" }); return; }
    const transition = validateVenueBookingTransition(row.booking.status, status, { reason, expiresAt: row.booking.expiresAt });
    if (!transition.ok) {
      res.status(transition.code === "HOLD_EXPIRED" || transition.code === "INVALID_TRANSITION" ? 409 : 400).json({ code: transition.code, error: transition.message }); return;
    }
    const changed = await db.transaction(async (tx) => {
      const updated = await tx.update(venueBookingsTable).set({
        status,
        expiresAt: null,
        paymentStatus: paymentStatusForVenueBooking(status, row.booking.paymentStatus),
      }).where(and(eq(venueBookingsTable.id, id), eq(venueBookingsTable.status, row.booking.status)));
      if (Number(updated[0].affectedRows) !== 1) return false;
      await tx.insert(venueBookingEventsTable).values({ bookingId: id, actorUserId: owner.userId, actorType: "venue_owner", eventType: "status_changed", fromStatus: row.booking.status, toStatus: status, notes: reason || null });
      return true;
    });
    if (!changed) {
      res.status(409).json({ code: "BOOKING_CHANGED", error: "تغيرت حالة الحجز؛ حدّث القائمة وحاول مجددًا" }); return;
    }
    if (["confirmed", "rejected", "completed"].includes(status)) {
      await createCustomerNotification({
        sessionId: String(row.booking.customerUserId),
        type: "venue_reservation_status",
        title: status === "confirmed" ? "تم قبول حجز القاعة" : status === "completed" ? "اكتمل حجز القاعة" : "تم رفض حجز القاعة",
        message: status === "confirmed" ? `تم قبول حجز ${row.venueName}.` : status === "completed" ? `اكتمل حجز ${row.venueName}.` : `لم يتم قبول حجز ${row.venueName}.${reason ? ` السبب: ${reason}` : ""}`,
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

router.get("/venues/:id/blackouts", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const month = String(req.query.month || "");
    if (!Number.isInteger(venueId) || venueId < 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      res.status(400).json({ error: "رقم القاعة أو الشهر غير صحيح" }); return;
    }
    const [venue] = await db.select({ id: venuesTable.id }).from(venuesTable)
      .where(and(eq(venuesTable.id, venueId), eq(venuesTable.ownerId, owner.id)));
    if (!venue) { res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    const [year, monthNumber] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const rows = await db.select().from(venueBlackoutsTable).where(and(
      eq(venueBlackoutsTable.venueId, venueId),
      lt(venueBlackoutsTable.startDate, monthEnd),
      gte(venueBlackoutsTable.endDate, monthStart),
    ));
    res.setHeader("Cache-Control", "no-store");
    res.json(rows);
  } catch (error) {
    req.log.error({ error }, "Partner list blackouts failed");
    res.status(500).json({ error: "تعذر تحميل الأيام المغلقة" });
  }
});

router.post("/venues/:id/blackouts", async (req, res): Promise<void> => {
  const owner = await getOwner(req, res);
  if (!owner) return;
  const venueId = Number.parseInt(req.params.id, 10);
  const startDate = String(req.body?.startDate || "");
  const endDate = String(req.body?.endDate || "");
  const audienceScope = String(req.body?.audienceScope || "both");
  if (!Number.isInteger(venueId) || venueId < 1 || !isDateOnly(startDate) || !isDateOnly(endDate)
    || endDate < startDate || startDate < new Date().toISOString().slice(0, 10)
    || !AUDIENCES.includes(audienceScope as AudienceScope)) {
    res.status(400).json({ error: "أدخل تاريخ البداية والنهاية ونطاق القسم بشكل صحيح" }); return;
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [venueRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, audience_scope FROM venues WHERE id = ? AND owner_id = ? FOR UPDATE",
      [venueId, owner.id],
    );
    const venue = venueRows[0];
    if (!venue) { await connection.rollback(); res.status(404).json({ error: "القاعة غير موجودة ضمن حسابك" }); return; }
    if (String(venue.audience_scope) !== "both" && audienceScope !== "both" && audienceScope !== String(venue.audience_scope)) {
      await connection.rollback(); res.status(400).json({ error: "القسم المختار غير متاح في هذه القاعة" }); return;
    }
    const [existingBookings] = await connection.query<RowDataPacket[]>(
      "SELECT audience, reservation_at, booking_days FROM venue_bookings WHERE venue_id = ? AND (status = 'confirmed' OR (status = 'pending' AND expires_at > UTC_TIMESTAMP()))",
      [venueId],
    );
    const conflicts = existingBookings.some((booking) => {
      if (audienceScope !== "both" && String(booking.audience) !== audienceScope) return false;
      const bookingStart = new Date(String(booking.reservation_at)).toISOString().slice(0, 10);
      const bookingEnd = new Date(`${bookingStart}T00:00:00.000Z`);
      bookingEnd.setUTCDate(bookingEnd.getUTCDate() + Math.max(1, Math.min(7, Number(booking.booking_days))) - 1);
      return bookingStart <= endDate && bookingEnd.toISOString().slice(0, 10) >= startDate;
    });
    if (conflicts) { await connection.rollback(); res.status(409).json({ error: "لا يمكن إغلاق فترة تشمل حجزًا مؤكدًا أو حجزًا مؤقتًا نشطًا" }); return; }
    const [result] = await connection.query<ResultSetHeader>(
      "INSERT INTO venue_blackouts (venue_id, audience_scope, start_date, end_date, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)",
      [venueId, audienceScope, startDate, endDate, reason, owner.userId],
    );
    await connection.commit();
    res.status(201).json({ id: Number(result.insertId), venueId, audienceScope, startDate, endDate });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error }, "Partner blackout create failed");
    res.status(500).json({ error: "تعذر إغلاق الأيام" });
  } finally {
    connection.release();
  }
});

router.delete("/venues/:id/blackouts/:blackoutId", async (req, res): Promise<void> => {
  try {
    const owner = await getOwner(req, res);
    if (!owner) return;
    const venueId = Number.parseInt(req.params.id, 10);
    const blackoutId = Number.parseInt(req.params.blackoutId, 10);
    if (!Number.isInteger(venueId) || venueId < 1 || !Number.isInteger(blackoutId) || blackoutId < 1) {
      res.status(400).json({ error: "رقم القاعة أو الإغلاق غير صحيح" }); return;
    }
    const [row] = await db.select({ id: venueBlackoutsTable.id, ownerId: venuesTable.ownerId })
      .from(venueBlackoutsTable).innerJoin(venuesTable, eq(venuesTable.id, venueBlackoutsTable.venueId))
      .where(and(eq(venueBlackoutsTable.id, blackoutId), eq(venueBlackoutsTable.venueId, venueId)));
    if (!row || row.ownerId !== owner.id) { res.status(404).json({ error: "الإغلاق غير موجود ضمن قاعاتك" }); return; }
    await db.delete(venueBlackoutsTable).where(eq(venueBlackoutsTable.id, blackoutId));
    res.json({ id: blackoutId, venueId, deleted: true });
  } catch (error) {
    req.log.error({ error }, "Partner reopen blackout failed");
    res.status(500).json({ error: "تعذر إعادة فتح الأيام" });
  }
});

export default router;
