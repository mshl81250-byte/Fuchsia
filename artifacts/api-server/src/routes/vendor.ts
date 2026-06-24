import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, productsTable, ordersTable, orderItemsTable } from "@workspace/db";
import { eq, desc, sum, count, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function parseProduct(p: typeof productsTable.$inferSelect) {
  return { ...p, images: JSON.parse(p.images || "[]"), tags: JSON.parse(p.tags || "[]") };
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "بيانات مفقودة" });

    const stores = await db.select().from(storesTable);
    const store = stores.find(s =>
      s.nameAr.toLowerCase().replace(/\s/g, "") === email.toLowerCase().replace(/\s/g, "") ||
      (s.phone && s.phone === email)
    );

    if (!store) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    const token = crypto.createHash("sha256").update(`${store.id}_vendor_lamsa`).digest("hex");
    res.json({ store, token });
  } catch (err) {
    req.log.error({ err }, "Vendor login failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const storeId = parseInt(req.query.storeId as string);
    if (!storeId) return res.status(400).json({ error: "storeId مطلوب" });

    const products = await db.select().from(productsTable).where(eq(productsTable.storeId, storeId));
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Vendor list products failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const storeId = parseInt(req.query.storeId as string);
    if (!storeId) return res.status(400).json({ error: "storeId مطلوب" });

    const storeProducts = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.storeId, storeId));
    const productIds = storeProducts.map(p => p.id);

    if (productIds.length === 0) return res.json([]);

    const orderItems = await db.select().from(orderItemsTable);
    const relevantOrderIds = [...new Set(
      orderItems.filter(oi => productIds.includes(oi.productId)).map(oi => oi.orderId)
    )];

    if (relevantOrderIds.length === 0) return res.json([]);

    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const relevant = orders.filter(o => relevantOrderIds.includes(o.id));

    const result = await Promise.all(relevant.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return { ...order, items, createdAt: order.createdAt.toISOString() };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Vendor list orders failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const storeId = parseInt(req.query.storeId as string);
    if (!storeId) return res.status(400).json({ error: "storeId مطلوب" });

    const [productCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.storeId, storeId));

    const storeProducts = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.storeId, storeId));
    const productIds = storeProducts.map(p => p.id);

    if (productIds.length === 0) {
      return res.json({ storeId, totalProducts: 0, totalOrders: 0, totalRevenue: 0, pendingOrders: 0, thisMonthRevenue: 0 });
    }

    const orderItems = await db.select().from(orderItemsTable);
    const relevantOrderIds = [...new Set(
      orderItems.filter(oi => productIds.includes(oi.productId)).map(oi => oi.orderId)
    )];

    const allOrders = await db.select().from(ordersTable);
    const vendorOrders = allOrders.filter(o => relevantOrderIds.includes(o.id));
    const totalRevenue = vendorOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = vendorOrders.filter(o => o.status !== "delivered").length;

    const now = new Date();
    const thisMonthRevenue = vendorOrders
      .filter(o => o.createdAt.getMonth() === now.getMonth() && o.createdAt.getFullYear() === now.getFullYear())
      .reduce((sum, o) => sum + o.total, 0);

    res.json({
      storeId,
      totalProducts: Number(productCount.count),
      totalOrders: vendorOrders.length,
      totalRevenue,
      pendingOrders,
      thisMonthRevenue,
    });
  } catch (err) {
    req.log.error({ err }, "Vendor stats failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
