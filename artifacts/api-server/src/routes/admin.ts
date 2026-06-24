import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, productsTable, storesTable, ordersTable,
  categoriesTable, bannersTable, couponsTable, insertCouponSchema,
  orderItemsTable
} from "@workspace/db";
import { eq, count, sum, desc } from "drizzle-orm";

const router = Router();

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
