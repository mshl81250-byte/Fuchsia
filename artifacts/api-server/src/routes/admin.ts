import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, productsTable, storesTable, ordersTable,
  categoriesTable, bannersTable, couponsTable, insertCouponSchema, insertCategorySchema, insertBannerSchema,
  insertProductSchema, insertStoreSchema,
  orderItemsTable, notificationChannelSettingsTable, cartItemsTable,
  walletTransactionsTable, venueBookingsTable, venuesTable, venueBookingEventsTable, venueOwnersTable,
  notificationsTable, orderStatusEventsTable
} from "@workspace/db";
import { eq, count, sum, desc, like, or, inArray } from "drizzle-orm";
import { requireAdmin, authenticateAdmin, setAdminSession, clearAdminSession } from "../lib/admin-auth";
import { createCustomerNotification } from "../lib/notifications";
import { appendOrderStatusEvent } from "../lib/order-tracking";
import { isWalletProviderConfigured, requestWalletRefund } from "../lib/wallet-gateway";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const admin = await authenticateAdmin(req.body?.email, req.body?.password);
    if (!admin) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    setAdminSession(res, admin.id);
    res.json({ admin });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(500).json({ error: "تعذر تسجيل الدخول" });
  }
});

router.get("/auth/me", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [admin] = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
    }).from(usersTable).where(eq(usersTable.email, "admin@fuchsia.ye"));

    if (!admin) {
      clearAdminSession(res);
      res.status(401).json({ error: "حساب الإدارة غير موجود" });
      return;
    }

    res.json({ admin });
  } catch (err) {
    req.log.error({ err }, "Admin session lookup failed");
    res.status(500).json({ error: "تعذر قراءة جلسة الإدارة" });
  }
});

router.post("/auth/logout", (_req, res): void => {
  clearAdminSession(res);
  res.status(204).send();
});

router.use(requireAdmin);

router.get("/command-center", async (req, res): Promise<void> => {
  try {
    const [
      [productCount],
      [storeCount],
      [orderCount],
      [userCount],
      [pendingOrderCount],
      [activePromotionCount],
      orderTotals,
      partnerOwners,
      storeOwnerLinks,
      reservations,
    ] = await Promise.all([
      db.select({ count: count() }).from(productsTable),
      db.select({ count: count() }).from(storesTable),
      db.select({ count: count() }).from(ordersTable),
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "received")),
      db.select({ count: count() }).from(bannersTable).where(eq(bannersTable.isActive, true)),
      db.select({ total: ordersTable.total }).from(ordersTable),
      db.select({
        id: venueOwnersTable.id,
        businessName: venueOwnersTable.businessName,
        status: venueOwnersTable.status,
        createdAt: venueOwnersTable.createdAt,
      }).from(venueOwnersTable).orderBy(desc(venueOwnersTable.createdAt)),
      db.select({
        id: storesTable.id,
        nameAr: storesTable.nameAr,
        ownerUserId: storesTable.ownerUserId,
        ownerName: usersTable.fullName,
      }).from(storesTable).leftJoin(usersTable, eq(storesTable.ownerUserId, usersTable.id)).orderBy(storesTable.id),
      db.select({
        id: venueBookingsTable.id,
        status: venueBookingsTable.status,
        venueName: venuesTable.nameAr,
        customerName: venueBookingsTable.customerName,
        reservationAt: venueBookingsTable.reservationAt,
      }).from(venueBookingsTable)
        .leftJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
        .orderBy(desc(venueBookingsTable.reservationAt))
        .limit(10),
    ]);

    const totalRevenue = orderTotals.reduce((total, order) => total + Number(order.total || 0), 0);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      generatedAt: new Date().toISOString(),
      stats: {
        totalProducts: Number(productCount.count),
        totalStores: Number(storeCount.count),
        totalOrders: Number(orderCount.count),
        totalUsers: Number(userCount.count),
        totalRevenue,
        pendingOrders: Number(pendingOrderCount.count),
        activePromotions: Number(activePromotionCount.count),
      },
      partnerOps: {
        totalOwners: partnerOwners.length,
        pendingOwners: partnerOwners.filter((owner) => owner.status === "pending").length,
        activeOwners: partnerOwners.filter((owner) => owner.status === "active").length,
        unassignedStores: storeOwnerLinks.filter((store) => !store.ownerUserId).length,
      },
      partnerOwners: partnerOwners.map((owner) => ({ ...owner, createdAt: owner.createdAt.toISOString() })),
      storeOwnerLinks,
      reservations: reservations.map((reservation) => ({ ...reservation, reservationAt: reservation.reservationAt.toISOString() })),
      health: { api: "ok" },
    });
  } catch (error) {
    req.log.error({ error }, "Admin command center failed");
    res.status(500).json({ error: "تعذر تحميل مركز التشغيل" });
  }
});

router.get("/venue-owners", async (req, res): Promise<void> => {
  try {
    const owners = await db.select({
      id: venueOwnersTable.id,
      userId: venueOwnersTable.userId,
      businessName: venueOwnersTable.businessName,
      contactPhone: venueOwnersTable.contactPhone,
      status: venueOwnersTable.status,
      createdAt: venueOwnersTable.createdAt,
    }).from(venueOwnersTable).orderBy(desc(venueOwnersTable.createdAt));
    res.json(owners.map((owner) => ({ ...owner, createdAt: owner.createdAt.toISOString() })));
  } catch (error) {
    req.log.error({ error }, "Admin list venue owners failed");
    res.status(500).json({ error: "تعذر تحميل طلبات الشراكة" });
  }
});

router.patch("/venue-owners/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const status = req.body?.status;
    if (!Number.isInteger(id) || id < 1 || !["pending", "active", "suspended"].includes(status)) {
      res.status(400).json({ error: "حالة اعتماد الشريك غير صحيحة" });
      return;
    }
    await db.update(venueOwnersTable).set({ status, updatedAt: new Date() }).where(eq(venueOwnersTable.id, id));
    const [owner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.id, id));
    if (!owner) { res.status(404).json({ error: "طلب الشراكة غير موجود" }); return; }
    res.json({ ...owner, createdAt: owner.createdAt.toISOString(), updatedAt: owner.updatedAt.toISOString() });
  } catch (error) {
    req.log.error({ error }, "Admin update venue owner failed");
    res.status(500).json({ error: "تعذر تحديث اعتماد الشريك" });
  }
});

router.get("/store-owner-links", async (req, res): Promise<void> => {
  try {
    const rows = await db.select({
      id: storesTable.id,
      nameAr: storesTable.nameAr,
      ownerUserId: storesTable.ownerUserId,
      ownerName: usersTable.fullName,
      ownerEmail: usersTable.email,
    }).from(storesTable).leftJoin(usersTable, eq(storesTable.ownerUserId, usersTable.id)).orderBy(storesTable.id);
    res.setHeader("Cache-Control", "no-store");
    res.json(rows);
  } catch (error) {
    req.log.error({ error }, "Admin list store owner links failed");
    res.status(500).json({ error: "تعذر تحميل ربط ملاك المتاجر" });
  }
});

router.patch("/stores/:id/owner", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const ownerUserId = req.body?.ownerUserId == null ? null : Number(req.body.ownerUserId);
    if (!Number.isInteger(id) || id < 1 || (ownerUserId !== null && (!Number.isInteger(ownerUserId) || ownerUserId < 1))) {
      res.status(400).json({ error: "معرف المتجر أو المالك غير صحيح" });
      return;
    }
    if (ownerUserId !== null) {
      const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, ownerUserId));
      if (!user) { res.status(404).json({ error: "حساب المستخدم غير موجود" }); return; }
    }
    const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.id, id));
    if (!store) { res.status(404).json({ error: "المتجر غير موجود" }); return; }
    await db.update(storesTable).set({ ownerUserId }).where(eq(storesTable.id, id));
    res.json({ success: true, storeId: id, ownerUserId });
  } catch (error) {
    req.log.error({ error }, "Admin assign store owner failed");
    res.status(500).json({ error: "تعذر ربط مالك المتجر" });
  }
});

router.get("/reservations", async (req, res): Promise<void> => {
  try {
    const rows = await db.select({
      id: venueBookingsTable.id,
      sessionId: venueBookingsTable.customerUserId,
      userId: venueBookingsTable.customerUserId,
      venueId: venueBookingsTable.venueId,
      storeName: venuesTable.nameAr,
      venueName: venuesTable.nameAr,
      audience: venueBookingsTable.audience,
      reservationAt: venueBookingsTable.reservationAt,
      bookingDays: venueBookingsTable.bookingDays,
      partySize: venueBookingsTable.partySize,
      customerName: venueBookingsTable.customerName,
      customerPhone: venueBookingsTable.customerPhone,
      occasion: venuesTable.nameAr,
      notes: venueBookingsTable.notes,
      status: venueBookingsTable.status,
      paymentType: venueBookingsTable.paymentType,
      paymentAmount: venueBookingsTable.paymentAmount,
      platformFee: venueBookingsTable.platformFee,
      paymentWalletId: venueBookingsTable.paymentWalletId,
      transactionReference: venueBookingsTable.transactionReference,
      paymentReceiptUrl: venueBookingsTable.paymentReceiptUrl,
      paymentStatus: venueBookingsTable.paymentStatus,
      expiresAt: venueBookingsTable.expiresAt,
      createdAt: venueBookingsTable.createdAt,
    }).from(venueBookingsTable)
      .leftJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
      .orderBy(desc(venueBookingsTable.reservationAt))
      .limit(250);
    res.setHeader("Cache-Control", "no-store");
    res.json(rows.map((row) => ({
      ...row,
      reservationAt: row.reservationAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Admin list reservations failed");
    res.status(500).json({ error: "تعذر تحميل الحجوزات" });
  }
});

router.patch("/reservations/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const status = req.body?.status;
    const allowedStatuses = ["pending", "confirmed", "rejected", "completed"];
    if (!Number.isInteger(id) || id < 1 || !allowedStatuses.includes(status)) {
      res.status(400).json({ error: status === "cancelled" ? "إلغاء حجز القاعة متوقف حتى اعتماد سياسة وشروط الإلغاء في لوحة التحكم." : "حالة الحجز أو رقمه غير صحيح" });
      return;
    }
    const [existing] = await db.select().from(venueBookingsTable).where(eq(venueBookingsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "الحجز غير موجود" });
      return;
    }
    if (status === "confirmed" && (existing.status !== "pending" || !existing.expiresAt || existing.expiresAt.getTime() <= Date.now())) {
      res.status(409).json({ error: "انتهت مهلة الحجز المؤقت؛ اطلب من العميل إنشاء طلب جديد بعد فحص التوفر" });
      return;
    }
    await db.update(venueBookingsTable).set({
      status,
      expiresAt: null,
      paymentStatus: status === "confirmed" ? "approved" : status === "rejected" ? "rejected" : existing.paymentStatus,
    }).where(eq(venueBookingsTable.id, id));
    await db.insert(venueBookingEventsTable).values({
      bookingId: id,
      actorType: "admin",
      eventType: "status_changed",
      fromStatus: existing.status,
      toStatus: status,
      notes: "تم التحديث من لوحة الإدارة",
    });
    const [row] = await db.select({
      id: venueBookingsTable.id,
      sessionId: venueBookingsTable.customerUserId,
      venueId: venueBookingsTable.venueId,
      storeName: venuesTable.nameAr,
      venueName: venuesTable.nameAr,
      audience: venueBookingsTable.audience,
      reservationAt: venueBookingsTable.reservationAt,
      bookingDays: venueBookingsTable.bookingDays,
      partySize: venueBookingsTable.partySize,
      customerName: venueBookingsTable.customerName,
      customerPhone: venueBookingsTable.customerPhone,
      notes: venueBookingsTable.notes,
      status: venueBookingsTable.status,
      paymentType: venueBookingsTable.paymentType,
      paymentAmount: venueBookingsTable.paymentAmount,
      platformFee: venueBookingsTable.platformFee,
      paymentWalletId: venueBookingsTable.paymentWalletId,
      transactionReference: venueBookingsTable.transactionReference,
      paymentReceiptUrl: venueBookingsTable.paymentReceiptUrl,
      paymentStatus: venueBookingsTable.paymentStatus,
      expiresAt: venueBookingsTable.expiresAt,
      createdAt: venueBookingsTable.createdAt,
    }).from(venueBookingsTable)
      .leftJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
      .where(eq(venueBookingsTable.id, id));
    if (!row) { res.status(404).json({ error: "الحجز غير موجود" }); return; }
    if (status === "confirmed" || status === "rejected" || status === "cancelled") {
      await createCustomerNotification({
        sessionId: String(row.sessionId),
        type: "venue_reservation_status",
        title: status === "confirmed" ? "تم قبول حجز القاعة" : status === "rejected" ? "تم رفض حجز القاعة" : "تم إلغاء حجز القاعة",
        message: status === "confirmed" ? `تم قبول حجز ${row.venueName || "القاعة"} والتأكد من التوفر.` : status === "rejected" ? `نعتذر، لم يتم قبول حجز ${row.venueName || "القاعة"} بعد مراجعة التوفر أو الإيصال.` : `تم إلغاء حجز ${row.venueName || "القاعة"}.`,
        customerName: row.customerName,
        phone: row.customerPhone,
      });
    }
    res.json({ ...row, reservationAt: row.reservationAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin reservation update failed");
    res.status(500).json({ error: "تعذر تحديث الحجز" });
  }
});

router.get("/carts", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(cartItemsTable)
      .orderBy(desc(cartItemsTable.createdAt)).limit(2000);
    const grouped = new Map<string, {
      sessionId: string;
      itemCount: number;
      totalQuantity: number;
      subtotal: number;
      lastActivityAt: string;
      items: Array<Record<string, unknown>>;
    }>();
    for (const row of rows) {
      const item = {
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        price: row.price,
        quantity: row.quantity,
        imageUrl: row.imageUrl,
        giftWrapping: row.giftWrapping,
        createdAt: row.createdAt.toISOString(),
      };
      const cart = grouped.get(row.sessionId) ?? {
        sessionId: row.sessionId,
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
        lastActivityAt: row.createdAt.toISOString(),
        items: [],
      };
      cart.itemCount += 1;
      cart.totalQuantity += row.quantity;
      cart.subtotal += row.price * row.quantity;
      cart.items.push(item);
      grouped.set(row.sessionId, cart);
    }
    const carts = [...grouped.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    res.setHeader("Cache-Control", "no-store");
    res.json({ carts: carts.slice(0, 200), truncated: rows.length === 2000, generatedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin list carts failed");
    res.status(500).json({ error: "تعذر تحميل السلال" });
  }
});

const rentalStatuses = [
  "rental_pending_confirmation",
  "rental_confirmed",
  "rental_rejected",
  "rental_preparing",
  "rental_out",
  "rental_return_pending",
  "rental_returned",
  "rental_late",
  "rental_damaged",
  "cancelled",
] as const;

router.get("/rentals", async (req, res): Promise<void> => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(500);
    const rentals = (await Promise.all(orders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      const rentalItems = items.filter((item) => item.fulfillmentType === "rental");
      if (rentalItems.length === 0 || (status && order.status !== status)) return null;
      return { ...order, items: rentalItems, createdAt: order.createdAt.toISOString() };
    }))).filter((order): order is NonNullable<typeof order> => order !== null);
    res.setHeader("Cache-Control", "no-store");
    res.json(rentals);
  } catch (err) {
    req.log.error({ err }, "Admin list rentals failed");
    res.status(500).json({ error: "تعذر تحميل الإيجارات" });
  }
});

router.patch("/rentals/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const status = req.body?.status;
    if (!Number.isInteger(id) || id < 1 || !rentalStatuses.includes(status)) {
      res.status(400).json({ error: "حالة الإيجار أو رقمه غير صحيح" });
      return;
    }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      res.status(404).json({ error: "طلب الإيجار غير موجود" });
      return;
    }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    if (!items.some((item) => item.fulfillmentType === "rental")) {
      res.status(400).json({ error: "الطلب لا يحتوي على عناصر إيجار" });
      return;
    }
    await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id));
    if (order.status !== status) await appendOrderStatusEvent(id, status, "admin");
    if (order.status !== status) {
      const rentalMessages: Record<string, { title: string; message: string }> = {
        rental_confirmed: { title: "تم قبول حجز الإيجار", message: `تم تأكيد توفر عناصر الإيجار للطلب رقم ${id}.` },
        rental_rejected: { title: "الإيجار غير متوفر", message: `نعتذر، عناصر الإيجار غير متوفرة للطلب رقم ${id} في التاريخ المطلوب. سيتواصل معك فريق فوشيا.` },
        rental_preparing: { title: "بدأ تجهيز الإيجار", message: `بدأ تجهيز عناصر الإيجار للطلب رقم ${id}.` },
        rental_out: { title: "تم تسليم الإيجار", message: `تم تسليم عناصر الإيجار للطلب رقم ${id}.` },
        rental_return_pending: { title: "حان موعد الاسترجاع", message: `حان موعد ترتيب استرجاع عناصر الإيجار للطلب رقم ${id}.` },
      };
      const message = rentalMessages[status];
      if (message) {
        const [recipient] = order.userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId)) : [];
        await createCustomerNotification({ sessionId: order.sessionId, orderId: id, type: "rental_status", ...message, customerName: order.customerName, phone: order.customerPhone, email: recipient?.email });
      }
    }
    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!updated) { res.status(404).json({ error: "طلب الإيجار غير موجود" }); return; }
    res.json({ ...updated, items: items.filter((item) => item.fulfillmentType === "rental"), createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin rental update failed");
    res.status(500).json({ error: "تعذر تحديث حالة الإيجار" });
  }
});

router.patch("/rentals/:id/deposit", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const damageDeduction = Number(req.body?.damageDeduction ?? 0);
    const lateFee = Number(req.body?.lateFee ?? 0);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : "";
    if (!Number.isInteger(id) || id < 1 || !Number.isFinite(damageDeduction) || !Number.isFinite(lateFee) || damageDeduction < 0 || lateFee < 0 || (!reason && damageDeduction + lateFee > 0)) {
      res.status(400).json({ error: "بيانات تسوية التأمين غير صحيحة" });
      return;
    }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "طلب الإيجار غير موجود" }); return; }
    if (order.rentalDeposit <= 0) { res.status(400).json({ error: "لا يوجد تأمين قابل للتسوية لهذا الطلب" }); return; }
    if (order.rentalDepositStatus !== "pending") { res.status(409).json({ error: "تمت تسوية تأمين هذا الطلب مسبقًا" }); return; }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    if (!items.some((item) => item.fulfillmentType === "rental")) { res.status(400).json({ error: "الطلب لا يحتوي على عناصر إيجار" }); return; }
    const totalDeduction = damageDeduction + lateFee;
    if (totalDeduction > order.rentalDeposit) { res.status(400).json({ error: "قيمة الخصم أكبر من مبلغ التأمين" }); return; }
    const refunded = order.rentalDeposit - totalDeduction;
    const settlementStatus = totalDeduction === 0 ? "refunded" : refunded === 0 ? "forfeited" : "partially_deducted";
    const nextOrderStatus = totalDeduction > 0 ? "rental_damaged" : "rental_returned";
    await db.update(ordersTable).set({
      status: nextOrderStatus,
      rentalDepositStatus: settlementStatus,
      rentalDepositRefunded: refunded,
      rentalDamageDeduction: damageDeduction,
      rentalLateFee: lateFee,
      rentalDepositReason: reason || null,
      rentalDepositProcessedAt: new Date(),
    }).where(eq(ordersTable.id, id));
    await appendOrderStatusEvent(id, nextOrderStatus, "admin");
    const refund = refunded > 0 ? await requestWalletRefund({
      orderId: id,
      walletId: order.paymentWalletId,
      amount: refunded,
      reason: reason || "استرداد تأمين الإيجار",
      idempotencyKey: `rental-deposit:${id}:${refunded.toFixed(2)}`,
    }) : null;
    const [recipient] = order.userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId)) : [];
    await createCustomerNotification({
      sessionId: order.sessionId,
      orderId: id,
      type: "rental_deposit_settled",
      title: totalDeduction === 0 ? "تم استرداد تأمين الإيجار" : "تمت تسوية تأمين الإيجار",
      message: totalDeduction === 0
        ? `تم اعتماد استرداد تأمين الإيجار للطلب رقم ${id} بمبلغ ${refunded.toLocaleString("ar-YE")} ريال${refund?.status === "manual_required" ? "، وسيتم تنفيذ التحويل يدويًا من المحفظة المحلية." : "، وجارٍ تنفيذ التحويل إلى المحفظة."}`
        : `تمت تسوية تأمين الإيجار للطلب رقم ${id}. المبلغ المسترد ${refunded.toLocaleString("ar-YE")} ريال. السبب: ${reason}${refund?.status === "manual_required" ? " وسيتم تنفيذ التحويل يدويًا." : ""}`,
      customerName: order.customerName,
      phone: order.customerPhone,
      email: recipient?.email,
    });
    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    res.json({ ...updated, refund, providerConfigured: isWalletProviderConfigured(), items: items.filter((item) => item.fulfillmentType === "rental"), createdAt: updated!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin rental deposit settlement failed");
    res.status(500).json({ error: "تعذر تسوية تأمين الإيجار" });
  }
});

router.get("/wallet-transactions", async (_req, res): Promise<void> => {
  try {
    const transactions = await db.select().from(walletTransactionsTable).orderBy(desc(walletTransactionsTable.createdAt)).limit(500);
    res.json({ providerConfigured: isWalletProviderConfigured(), transactions: transactions.map((transaction) => ({ ...transaction, createdAt: transaction.createdAt.toISOString(), processedAt: transaction.processedAt?.toISOString() ?? null })) });
  } catch (err) {
    res.status(500).json({ error: "تعذر تحميل معاملات المحافظ" });
  }
});

router.get("/notification-settings", async (_req, res): Promise<void> => {
  try {
    const settings = await db.select().from(notificationChannelSettingsTable);
    res.json({ settings, credentials: { whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID), email: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST) } });
  } catch (err) {
    res.status(500).json({ error: "تعذر تحميل إعدادات الإشعارات" });
  }
});

router.patch("/notification-settings/:channel", async (req, res): Promise<void> => {
  try {
    const channel = req.params.channel;
    if (!["whatsapp", "email"].includes(channel)) {
      res.status(400).json({ error: "القناة غير صحيحة" });
      return;
    }
    const { enabled, provider, sender, template } = req.body ?? {};
    if (typeof enabled !== "boolean" || typeof provider !== "string" || typeof template !== "string") {
      res.status(400).json({ error: "إعدادات القناة غير مكتملة" });
      return;
    }
    await db.insert(notificationChannelSettingsTable).values({
      channel, enabled, provider: provider.slice(0, 80), sender: typeof sender === "string" ? sender.slice(0, 160) : null, template: template.slice(0, 1000), updatedAt: new Date(),
    }).onDuplicateKeyUpdate({ set: { enabled, provider: provider.slice(0, 80), sender: typeof sender === "string" ? sender.slice(0, 160) : null, template: template.slice(0, 1000), updatedAt: new Date() } });
    const [setting] = await db.select().from(notificationChannelSettingsTable).where(eq(notificationChannelSettingsTable.channel, channel));
    if (!setting) { res.status(500).json({ error: "تعذر حفظ إعدادات القناة" }); return; }
    res.json(setting);
  } catch (err) {
    req.log.error({ err }, "Admin notification settings update failed");
    res.status(500).json({ error: "تعذر حفظ إعدادات القناة" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120) : "";
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const where = search
      ? or(like(usersTable.fullName, `%${search}%`), like(usersTable.email, `%${search}%`), like(usersTable.phone, `%${search}%`))
      : undefined;
    const users = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      phone: usersTable.phone,
      isGuest: usersTable.isGuest,
      rewardPoints: usersTable.rewardPoints,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(limit);

    res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), avatarUrl: null, address: null })));
  } catch (err) {
    req.log.error({ err }, "Admin list users failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/users/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "معرف العميل غير صحيح" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "العميل غير موجود" }); return; }

    const [orders, bookings] = await Promise.all([
      db.select().from(ordersTable).where(eq(ordersTable.userId, id)).orderBy(desc(ordersTable.createdAt)).limit(100),
      db.select({
        id: venueBookingsTable.id,
        venueId: venueBookingsTable.venueId,
        venueName: venuesTable.nameAr,
        status: venueBookingsTable.status,
        reservationAt: venueBookingsTable.reservationAt,
        bookingDays: venueBookingsTable.bookingDays,
        paymentStatus: venueBookingsTable.paymentStatus,
      }).from(venueBookingsTable)
        .leftJoin(venuesTable, eq(venueBookingsTable.venueId, venuesTable.id))
        .where(eq(venueBookingsTable.customerUserId, id))
        .orderBy(desc(venueBookingsTable.reservationAt)).limit(100),
    ]);
    const orderIds = orders.map((order) => order.id);
    const [orderEvents, notifications] = await Promise.all([
      orderIds.length
        ? db.select().from(orderStatusEventsTable).where(inArray(orderStatusEventsTable.orderId, orderIds)).orderBy(desc(orderStatusEventsTable.createdAt)).limit(250)
        : Promise.resolve([]),
      db.select().from(notificationsTable).where(eq(notificationsTable.sessionId, orders[0]?.sessionId ?? "")).orderBy(desc(notificationsTable.createdAt)).limit(100),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      user: { ...user, createdAt: user.createdAt.toISOString() },
      orders: orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() })),
      bookings: bookings.map((booking) => ({ ...booking, reservationAt: booking.reservationAt.toISOString() })),
      orderEvents: orderEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
      notifications: notifications.map((notification) => ({ ...notification, createdAt: notification.createdAt.toISOString() })),
    });
  } catch (error) {
    req.log.error({ error }, "Admin customer detail failed");
    res.status(500).json({ error: "تعذر تحميل تفاصيل العميل" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
    const result = await Promise.all(orders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return { ...order, items, createdAt: order.createdAt.toISOString() };
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Admin list orders failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status, driverName, driverPhone } = req.body ?? {};
    const allowedStatuses = ["received", "preparing", "delivering", "delivered", "cancelled"];
    if (!Number.isInteger(id) || id < 1 || !allowedStatuses.includes(status)) {
      res.status(400).json({ error: "بيانات تحديث الطلب غير صحيحة" });
      return;
    }

    const [previous] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!previous) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    await db.update(ordersTable).set({
      status,
      driverName: driverName === undefined ? undefined : (driverName || null),
      driverPhone: driverPhone === undefined ? undefined : (driverPhone || null),
    }).where(eq(ordersTable.id, id));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));

    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const statusChanged = previous.status !== status;
    if (statusChanged) await appendOrderStatusEvent(order.id, status, "admin");

    const statusMessages: Record<string, { title: string; message: string }> = {
      preparing: { title: "بدأ تجهيز طلبك", message: `بدأ فريق فوشيا تجهيز الطلب رقم ${order.id}.` },
      delivering: { title: "طلبك في الطريق", message: `خرج الطلب رقم ${order.id} مع مندوب التوصيل.` },
      delivered: { title: "تم توصيل طلبك", message: `تم توصيل الطلب رقم ${order.id} بنجاح.` },
      received: { title: "تم تحديث طلبك", message: `تم تحديث حالة الطلب رقم ${order.id}.` },
    };
    const statusMessage = statusMessages[status];
    const [statusRecipient] = order.userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId)) : [];
    if (statusChanged && statusMessage) await createCustomerNotification({ sessionId: order.sessionId, orderId: order.id, type: "order_status", ...statusMessage, customerName: order.customerName, phone: order.customerPhone, email: statusRecipient?.email });

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    res.json({ ...order, items, createdAt: order.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin update order failed");
    res.status(500).json({ error: "تعذر تحديث الطلب" });
  }
});

router.patch("/orders/:id/payment", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status } = req.body ?? {};
    if (!Number.isInteger(id) || !["verified", "rejected"].includes(status)) {
      res.status(400).json({ error: "حالة الدفع غير صحيحة" });
      return;
    }
    const [current] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!current) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    await db.update(ordersTable).set({ paymentStatus: status }).where(eq(ordersTable.id, id));
    await db.update(walletTransactionsTable).set({ status: status === "verified" ? "completed" : "failed", processedAt: status === "verified" ? new Date() : null }).where(eq(walletTransactionsTable.orderId, id));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
    const [paymentRecipient] = order.userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId)) : [];
    await createCustomerNotification({
      sessionId: order.sessionId,
      orderId: order.id,
      type: status === "verified" ? "payment_verified" : "payment_rejected",
      title: status === "verified" ? "تم اعتماد إيصال الدفع" : "تعذر اعتماد إيصال الدفع",
      message: status === "verified" ? `تم اعتماد التحويل الخاص بالطلب رقم ${order.id}.` : `يرجى مراجعة إيصال التحويل وإرساله مجدداً للطلب رقم ${order.id}.`,
      customerName: order.customerName,
      phone: order.customerPhone,
      email: paymentRecipient?.email,
    });
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    res.json({ ...order, items, createdAt: order.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Admin payment review failed");
    res.status(500).json({ error: "تعذر تحديث حالة الدفع" });
  }
});

router.get("/coupons", async (req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.id));
    res.json(coupons);
  } catch (err) {
    req.log.error({ err }, "Admin list coupons failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const data = insertCouponSchema.parse(req.body);
    await db.insert(couponsTable).values(data);
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, data.code));
    if (!coupon) { res.status(400).json({ error: "تعذر إنشاء القسيمة" }); return; }
    res.status(201).json(coupon);
  } catch (err) {
    req.log.error({ err }, "Admin create coupon failed");
    res.status(400).json({ error: "بيانات غير صحيحة" });
  }
});

router.get("/products", async (req, res): Promise<void> => {
  try {
    res.json(await db.select().from(productsTable).orderBy(desc(productsTable.id)));
  } catch (error) {
    req.log.error({ error }, "Admin list products failed");
    res.status(500).json({ error: "تعذر تحميل المنتجات" });
  }
});

router.post("/products", async (req, res): Promise<void> => {
  try {
    const data = insertProductSchema.parse(req.body);
    await db.insert(productsTable).values(data);
    const [product] = await db.select().from(productsTable).orderBy(desc(productsTable.id)).limit(1);
    res.status(201).json(product);
  } catch (error) {
    req.log.error({ error }, "Admin create product failed");
    res.status(400).json({ error: "بيانات المنتج غير صحيحة" });
  }
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "رقم المنتج غير صحيح" }); return; }
    const updates = insertProductSchema.partial().parse(req.body);
    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ error: "المنتج غير موجود" }); return; }
    res.json(product);
  } catch (error) {
    req.log.error({ error }, "Admin update product failed");
    res.status(400).json({ error: "تعذر تحديث المنتج" });
  }
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "رقم المنتج غير صحيح" }); return; }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    req.log.error({ error }, "Admin delete product failed");
    res.status(400).json({ error: "تعذر حذف المنتج" });
  }
});

router.get("/stores", async (req, res): Promise<void> => {
  try { res.json(await db.select().from(storesTable).orderBy(desc(storesTable.id))); }
  catch (error) { req.log.error({ error }, "Admin list stores failed"); res.status(500).json({ error: "تعذر تحميل المتاجر" }); }
});

router.post("/stores", async (req, res): Promise<void> => {
  try {
    const data = insertStoreSchema.parse(req.body);
    await db.insert(storesTable).values(data);
    const [store] = await db.select().from(storesTable).orderBy(desc(storesTable.id)).limit(1);
    res.status(201).json(store);
  } catch (error) { req.log.error({ error }, "Admin create store failed"); res.status(400).json({ error: "بيانات المتجر غير صحيحة" }); }
});

router.patch("/stores/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const updates = insertStoreSchema.partial().parse(req.body);
    await db.update(storesTable).set(updates).where(eq(storesTable.id, id));
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, id));
    if (!store) { res.status(404).json({ error: "المتجر غير موجود" }); return; }
    res.json(store);
  } catch (error) { req.log.error({ error }, "Admin update store failed"); res.status(400).json({ error: "تعذر تحديث المتجر" }); }
});

router.delete("/stores/:id", async (req, res): Promise<void> => {
  try { await db.delete(storesTable).where(eq(storesTable.id, Number(req.params.id))); res.json({ success: true }); }
  catch (error) { req.log.error({ error }, "Admin delete store failed"); res.status(400).json({ error: "تعذر حذف المتجر" }); }
});

router.get("/categories", async (req, res): Promise<void> => {
  try { res.json(await db.select().from(categoriesTable).orderBy(desc(categoriesTable.id))); }
  catch (error) { req.log.error({ error }, "Admin list categories failed"); res.status(500).json({ error: "تعذر تحميل التصنيفات" }); }
});

router.post("/categories", async (req, res): Promise<void> => {
  try {
    const data = insertCategorySchema.parse(req.body);
    await db.insert(categoriesTable).values(data);
    const [category] = await db.select().from(categoriesTable).orderBy(desc(categoriesTable.id)).limit(1);
    res.status(201).json(category);
  } catch (error) { req.log.error({ error }, "Admin create category failed"); res.status(400).json({ error: "بيانات التصنيف غير صحيحة" }); }
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const updates = insertCategorySchema.partial().parse(req.body);
    await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id));
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!category) { res.status(404).json({ error: "التصنيف غير موجود" }); return; }
    res.json(category);
  } catch (error) { req.log.error({ error }, "Admin update category failed"); res.status(400).json({ error: "تعذر تحديث التصنيف" }); }
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  try { await db.delete(categoriesTable).where(eq(categoriesTable.id, Number(req.params.id))); res.json({ success: true }); }
  catch (error) { req.log.error({ error }, "Admin delete category failed"); res.status(400).json({ error: "تعذر حذف التصنيف" }); }
});

router.get("/banners", async (req, res): Promise<void> => {
  try { res.json(await db.select().from(bannersTable).orderBy(bannersTable.sortOrder, desc(bannersTable.id))); }
  catch (error) { req.log.error({ error }, "Admin list banners failed"); res.status(500).json({ error: "تعذر تحميل البنرات" }); }
});

router.post("/banners", async (req, res): Promise<void> => {
  try {
    const data = insertBannerSchema.parse(req.body);
    await db.insert(bannersTable).values(data);
    const [banner] = await db.select().from(bannersTable).orderBy(desc(bannersTable.id)).limit(1);
    res.status(201).json(banner);
  } catch (error) { req.log.error({ error }, "Admin create banner failed"); res.status(400).json({ error: "بيانات البنر غير صحيحة" }); }
});

router.patch("/banners/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const updates = insertBannerSchema.partial().parse(req.body);
    await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id));
    const [banner] = await db.select().from(bannersTable).where(eq(bannersTable.id, id));
    if (!banner) { res.status(404).json({ error: "البنر غير موجود" }); return; }
    res.json(banner);
  } catch (error) { req.log.error({ error }, "Admin update banner failed"); res.status(400).json({ error: "تعذر تحديث البنر" }); }
});

router.delete("/banners/:id", async (req, res): Promise<void> => {
  try { await db.delete(bannersTable).where(eq(bannersTable.id, Number(req.params.id))); res.json({ success: true }); }
  catch (error) { req.log.error({ error }, "Admin delete banner failed"); res.status(400).json({ error: "تعذر حذف البنر" }); }
});

export default router;
