import { Router, type Request, type Response } from "express";
import { and, desc, eq, inArray, count } from "drizzle-orm";
import { db, storesTable, productsTable, ordersTable, orderItemsTable, insertProductSchema } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();
const OWNER_PRODUCT_FIELDS = [
  "nameAr", "nameEn", "description", "price", "discountPrice", "fulfillmentType", "rentalCategory", "eventAudience",
  "tableHeightCm", "availableColors", "rentalDailyPrice", "rentalDeposit", "rentalMinDays", "rentalMaxDays",
  "categoryId", "imageUrl", "images", "videoUrl", "brand", "inStock", "stockQuantity", "deliveryDays", "tags", "occasionTags", "isPublished",
] as const;

function ownerProductFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const body = value as Record<string, unknown>;
  return Object.fromEntries(OWNER_PRODUCT_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

function parseArray(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function parseProduct(product: typeof productsTable.$inferSelect) {
  return {
    ...product,
    images: parseArray(product.images),
    tags: parseArray(product.tags),
    occasionTags: parseArray(product.occasionTags),
    availableColors: parseArray(product.availableColors),
    offerEndsAt: product.offerEndsAt?.toISOString() ?? null,
  };
}

async function authorizeStore(req: Request, res: Response, requestedStoreId?: number): Promise<number | null> {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return null; }
  const storeId = requestedStoreId ?? Number(req.query.storeId ?? req.body?.storeId);
  if (!Number.isInteger(storeId) || storeId < 1) { res.status(400).json({ error: "storeId مطلوب" }); return null; }
  const [store] = await db.select({ id: storesTable.id, ownerUserId: storesTable.ownerUserId }).from(storesTable).where(eq(storesTable.id, storeId));
  if (!store || store.ownerUserId !== userId) { res.status(403).json({ error: "لا تملك صلاحية إدارة هذا المتجر" }); return null; }
  return store.id;
}

function publishable(product: typeof productsTable.$inferSelect | Record<string, unknown>): boolean {
  const item = product as Record<string, unknown>;
  const nameAr = typeof item.nameAr === "string" ? item.nameAr.trim() : "";
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const fulfillmentType = String(item.fulfillmentType || "sale");
  let validImageUrl = false;
  try { const url = new URL(imageUrl); validImageUrl = ["http:", "https:"].includes(url.protocol); } catch { validImageUrl = false; }
  if (!nameAr || !validImageUrl) return false;
  if (fulfillmentType === "sale") return Number(item.price) > 0;
  if (fulfillmentType !== "rental" || Number(item.rentalDailyPrice) <= 0
    || !["kosh", "table", "other"].includes(String(item.rentalCategory))
    || !["women", "men", "both"].includes(String(item.eventAudience))) return false;
  if (item.rentalCategory === "table") {
    const colors = typeof item.availableColors === "string" ? parseArray(item.availableColors) : Array.isArray(item.availableColors) ? item.availableColors : [];
    return Number(item.tableHeightCm) > 0 && Number(item.stockQuantity) > 0 && colors.length > 0;
  }
  return Number(item.stockQuantity) > 0;
}

router.get("/stores", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
    const stores = await db.select().from(storesTable).where(eq(storesTable.ownerUserId, userId));
    res.setHeader("Cache-Control", "no-store");
    res.json(stores);
  } catch (error) {
    req.log.error({ error }, "Vendor list stores failed");
    res.status(500).json({ error: "تعذر تحميل المتاجر المرتبطة بحسابك" });
  }
});

router.get("/products", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const products = await db.select().from(productsTable).where(eq(productsTable.storeId, storeId));
    res.setHeader("Cache-Control", "no-store");
    res.json(products.map(parseProduct));
  } catch (error) {
    req.log.error({ error }, "Vendor list products failed");
    res.status(500).json({ error: "تعذر تحميل المنتجات" });
  }
});

router.post("/products", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const productData = insertProductSchema.parse({ ...ownerProductFields(req.body), storeId, isPublished: false });
    const [insertResult] = await db.insert(productsTable).values(productData);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(insertResult.insertId)));
    if (!product) { res.status(500).json({ error: "تعذر استرجاع المنتج المحفوظ" }); return; }
    res.status(201).json(parseProduct(product));
  } catch (error) {
    req.log.error({ error }, "Vendor create product failed");
    res.status(400).json({ error: "تحقق من بيانات المنتج؛ يُحفظ المنتج الجديد كمسودة غير منشورة" });
  }
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
    const id = Number.parseInt(req.params.id, 10);
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) { res.status(404).json({ error: "المنتج غير موجود" }); return; }
    const [store] = await db.select({ ownerUserId: storesTable.ownerUserId }).from(storesTable).where(eq(storesTable.id, existing.storeId));
    if (!store || store.ownerUserId !== userId) { res.status(403).json({ error: "لا تملك صلاحية تعديل هذا المنتج" }); return; }
    const updates = insertProductSchema.partial().parse(ownerProductFields(req.body)) as Partial<typeof productsTable.$inferInsert>;
    delete updates.storeId;
    delete updates.categoryId;
    const next = { ...existing, ...updates };
    if (req.body?.isPublished === true && !publishable(next)) {
      res.status(400).json({ error: "لا يمكن نشر المنتج قبل إدخال السعر والصورة؛ والطاولة تحتاج ارتفاعًا وكمية وألوانًا" }); return;
    }
    if (req.body?.isPublished !== true && req.body?.isPublished !== false) delete updates.isPublished;
    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
    const [updated] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    res.json(updated ? parseProduct(updated) : null);
  } catch (error) {
    req.log.error({ error }, "Vendor update product failed");
    res.status(400).json({ error: "تعذر تحديث المنتج؛ راجع القيم المدخلة" });
  }
});

router.get("/orders", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const storeProducts = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.storeId, storeId));
    const productIds = storeProducts.map((item) => item.id);
    if (productIds.length === 0) { res.json([]); return; }
    const ownedItems = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.productId, productIds));
    const orderIds = [...new Set(ownedItems.map((item) => item.orderId))];
    if (orderIds.length === 0) { res.json([]); return; }
    const orders = await db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds)).orderBy(desc(ordersTable.createdAt));
    const result = orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      items: ownedItems.filter((item) => item.orderId === order.id),
      vendorSubtotal: ownedItems.filter((item) => item.orderId === order.id).reduce((sum, item) => sum + item.price * item.quantity, 0),
    }));
    res.setHeader("Cache-Control", "no-store");
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Vendor list orders failed");
    res.status(500).json({ error: "تعذر تحميل الطلبات" });
  }
});

router.get("/stats", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const [productCount] = await db.select({ count: count() }).from(productsTable).where(eq(productsTable.storeId, storeId));
    const storeProducts = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.storeId, storeId));
    const productIds = storeProducts.map((product) => product.id);
    if (productIds.length === 0) { res.json({ storeId, totalProducts: Number(productCount.count), totalOrders: 0, totalRevenue: 0, pendingOrders: 0, thisMonthRevenue: 0 }); return; }
    const items = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.productId, productIds));
    const orderIds = [...new Set(items.map((item) => item.orderId))];
    const orders = orderIds.length ? await db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds)) : [];
    const revenueByOrder = new Map<number, number>();
    for (const item of items) revenueByOrder.set(item.orderId, (revenueByOrder.get(item.orderId) || 0) + item.price * item.quantity);
    const totalRevenue = [...revenueByOrder.values()].reduce((sum, value) => sum + value, 0);
    const pendingOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
    const now = new Date();
    const thisMonthRevenue = orders.filter((order) => order.createdAt.getMonth() === now.getMonth() && order.createdAt.getFullYear() === now.getFullYear())
      .reduce((sum, order) => sum + (revenueByOrder.get(order.id) || 0), 0);
    res.json({ storeId, totalProducts: Number(productCount.count), totalOrders: orders.length, totalRevenue, pendingOrders, thisMonthRevenue });
  } catch (error) {
    req.log.error({ error }, "Vendor stats failed");
    res.status(500).json({ error: "تعذر تحميل إحصاءات المتجر" });
  }
});

export default router;
