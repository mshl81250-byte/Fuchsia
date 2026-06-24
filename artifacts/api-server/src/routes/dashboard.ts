import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, storesTable, ordersTable, categoriesTable, bannersTable, usersTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [productCount] = await db.select({ count: count() }).from(productsTable);
    const [storeCount] = await db.select({ count: count() }).from(storesTable);
    const [orderCount] = await db.select({ count: count() }).from(ordersTable);
    const [categoryCount] = await db.select({ count: count() }).from(categoriesTable);
    const [featuredCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.isFeatured, true));
    const [newCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.isNew, true));
    const [bannerCount] = await db.select({ count: count() }).from(bannersTable).where(eq(bannersTable.isActive, true));
    const [userCount] = await db.select({ count: count() }).from(usersTable);
    const [pendingCount] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "received"));
    const orders = await db.select({ total: ordersTable.total }).from(ordersTable);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    res.json({
      totalProducts: Number(productCount.count),
      totalStores: Number(storeCount.count),
      totalOrders: Number(orderCount.count),
      totalCategories: Number(categoryCount.count),
      totalUsers: Number(userCount.count),
      totalRevenue,
      featuredProductsCount: Number(featuredCount.count),
      newArrivalsCount: Number(newCount.count),
      topCategory: "مستحضرات تجميل",
      activePromotions: Number(bannerCount.count),
      pendingOrders: Number(pendingCount.count),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
