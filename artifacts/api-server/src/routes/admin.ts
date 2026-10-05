import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, productsTable, storesTable, ordersTable,
  categoriesTable, bannersTable, couponsTable, insertCouponSchema,
  orderItemsTable
} from "@workspace/db";
import { eq, count, sum, desc } from "drizzle-orm";
import { requireAdmin, authenticateAdmin, setAdminSession, clearAdminSession } from "../lib/admin-auth";
import { createCustomerNotification } from "../lib/notifications";

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

router.get("/users", async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      phone: usersTable.phone,
      isGuest: usersTable.isGuest,
      rewardPoints: usersTable.rewardPoints,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100);

    res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), avatarUrl: null, address: null })));
  } catch (err) {
    req.log.error({ err }, "Admin list users failed");
    res.status(500).json({ error: "حدث خطأ" });
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
    if (!Number.isInteger(id) || !status) {
      res.status(400).json({ error: "بيانات تحديث الطلب غير صحيحة" });
      return;
    }

    const [order] = await db.update(ordersTable).set({
      status,
      driverName: driverName === undefined ? undefined : (driverName || null),
      driverPhone: driverPhone === undefined ? undefined : (driverPhone || null),
    }).where(eq(ordersTable.id, id)).returning();

    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const statusMessages: Record<string, { title: string; message: string }> = {
      preparing: { title: "بدأ تجهيز طلبك", message: `بدأ فريق فوشيا تجهيز الطلب رقم ${order.id}.` },
      delivering: { title: "طلبك في الطريق", message: `خرج الطلب رقم ${order.id} مع مندوب التوصيل.` },
      delivered: { title: "تم توصيل طلبك", message: `تم توصيل الطلب رقم ${order.id} بنجاح.` },
      received: { title: "تم تحديث طلبك", message: `تم تحديث حالة الطلب رقم ${order.id}.` },
    };
    const statusMessage = statusMessages[status];
    if (statusMessage) await createCustomerNotification({ sessionId: order.sessionId, orderId: order.id, type: "order_status", ...statusMessage });

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
    const [order] = await db.update(ordersTable).set({ paymentStatus: status }).where(eq(ordersTable.id, id)).returning();
    await createCustomerNotification({
      sessionId: order.sessionId,
      orderId: order.id,
      type: status === "verified" ? "payment_verified" : "payment_rejected",
      title: status === "verified" ? "تم اعتماد إيصال الدفع" : "تعذر اعتماد إيصال الدفع",
      message: status === "verified" ? `تم اعتماد التحويل الخاص بالطلب رقم ${order.id}.` : `يرجى مراجعة إيصال التحويل وإرساله مجدداً للطلب رقم ${order.id}.`,
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
    const [coupon] = await db.insert(couponsTable).values(data).returning();
    res.status(201).json(coupon);
  } catch (err) {
    req.log.error({ err }, "Admin create coupon failed");
    res.status(400).json({ error: "بيانات غير صحيحة" });
  }
});

export default router;
