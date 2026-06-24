import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, storesTable, ordersTable, categoriesTable, bannersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

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

    res.json({
      totalProducts: Number(productCount.count),
      totalStores: Number(storeCount.count),
      totalOrders: Number(orderCount.count),
      totalCategories: Number(categoryCount.count),
      featuredProductsCount: Number(featuredCount.count),
      newArrivalsCount: Number(newCount.count),
      topCategory: "مستحضرات تجميل",
      activePromotions: Number(bannerCount.count),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
