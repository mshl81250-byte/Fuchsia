import { Router, type Request, type Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { and, desc, eq, inArray, count } from "drizzle-orm";
import { db, pool, storesTable, usersTable, productsTable, ordersTable, orderItemsTable, rentalMaintenanceBlocksTable, insertProductSchema } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";
import { createCustomerNotification } from "../lib/notifications";
import { addDateDays, getRentalOccupancy } from "../lib/rental-availability";
import { normalizeProductImageList } from "../lib/product-images";

const router = Router();
const OWNER_PRODUCT_FIELDS = [
  "nameAr", "nameEn", "description", "price", "discountPrice", "fulfillmentType", "rentalCategory", "eventAudience",
  "tableHeightCm", "tableWidthCm", "tableLengthCm", "tableDiameterCm", "tableSeats", "setupNotes", "availableColors", "rentalDailyPrice", "rentalDeposit", "rentalMinDays", "rentalMaxDays", "rentalBufferDays",
  "categoryId", "imageUrl", "images", "videoUrl", "brand", "inStock", "stockQuantity", "deliveryDays", "tags", "occasionTags", "isPublished",
] as const;

function ownerProductFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const body = value as Record<string, unknown>;
  return Object.fromEntries(OWNER_PRODUCT_FIELDS
    .filter((key) => body[key] !== undefined)
    .map((key) => [key, key === "images" ? normalizeProductImageList(body[key]) : body[key]]));
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
  const [account] = await db.select({ accountType: usersTable.accountType, partnerPermissions: usersTable.partnerPermissions }).from(usersTable).where(eq(usersTable.id, userId));
  if (account?.accountType === "partner") {
    let permissions = { products: true, rentals: true };
    try { permissions = { ...permissions, ...(JSON.parse(account.partnerPermissions || "{}") as Partial<typeof permissions>) }; } catch { /* keep safe legacy defaults */ }
    const needed = req.path.startsWith("/products") ? "products" : req.path.includes("rental") || req.path.includes("maintenance") ? "rentals" : null;
    if (needed && !permissions[needed]) { res.status(403).json({ error: "حسابك غير مخول لاستخدام هذه الميزة" }); return null; }
  }
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
  if (!Number.isInteger(Number(item.rentalBufferDays ?? 0)) || Number(item.rentalBufferDays ?? 0) < 0 || Number(item.rentalBufferDays ?? 0) > 14) return false;
  if (item.rentalCategory === "table") {
    const colors = typeof item.availableColors === "string" ? parseArray(item.availableColors) : Array.isArray(item.availableColors) ? item.availableColors : [];
    const rectangular = Number(item.tableWidthCm) > 0 && Number(item.tableLengthCm) > 0;
    const round = Number(item.tableDiameterCm) > 0;
    return Number(item.tableHeightCm) > 0 && (rectangular || round) && Number(item.tableSeats) > 0 && Number(item.stockQuantity) > 0 && colors.length > 0;
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
    const productData = insertProductSchema.parse({ ...ownerProductFields(req.body), storeId, isPublished: true });
    if (!publishable(productData)) {
      res.status(400).json({ error: "أكمل بيانات المنتج والصورة والسعر والمخزون قبل الحفظ؛ سيظهر المنتج للعملاء مباشرة بعد نجاح الحفظ" });
      return;
    }
    const [insertResult] = await db.insert(productsTable).values(productData);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(insertResult.insertId)));
    if (!product) { res.status(500).json({ error: "تعذر استرجاع المنتج المحفوظ" }); return; }
    res.status(201).json(parseProduct(product));
  } catch (error) {
    req.log.error({ error }, "Vendor create product failed");
    res.status(400).json({ error: "تعذر إنشاء المنتج؛ راجع البيانات المطلوبة ثم حاول مجددًا" });
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

router.get("/rental-bookings", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const rentalProducts = await db.select({ id: productsTable.id }).from(productsTable)
      .where(and(eq(productsTable.storeId, storeId), eq(productsTable.fulfillmentType, "rental")));
    const productIds = rentalProducts.map((item) => item.id);
    if (!productIds.length) { res.json([]); return; }
    const ownedItems = await db.select().from(orderItemsTable)
      .where(and(inArray(orderItemsTable.productId, productIds), eq(orderItemsTable.fulfillmentType, "rental")));
    const orderIds = [...new Set(ownedItems.map((item) => item.orderId))];
    if (!orderIds.length) { res.json([]); return; }
    const orders = await db.select().from(ordersTable).where(inArray(ordersTable.id, orderIds)).orderBy(desc(ordersTable.createdAt));
    const [changeRequests] = await pool.query<RowDataPacket[]>(
      `SELECT id, booking_id AS bookingId, request_type AS requestType, requested_start_date AS requestedStartDate,
              reason, status, response_note AS responseNote, created_at AS createdAt
       FROM booking_change_requests WHERE booking_type = 'rental' AND status = 'pending' AND booking_id IN (${orderIds.map(() => "?").join(",")})
       ORDER BY created_at`, orderIds,
    );
    res.setHeader("Cache-Control", "no-store");
    res.json(orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      items: ownedItems.filter((item) => item.orderId === order.id),
      vendorSubtotal: ownedItems.filter((item) => item.orderId === order.id).reduce((sum, item) => sum + item.price * item.quantity, 0),
      changeRequests: changeRequests.filter((request) => Number(request.bookingId) === order.id).map((request) => ({ ...request, createdAt: new Date(request.createdAt).toISOString() })),
    })));
  } catch (error) {
    req.log.error({ error }, "Vendor list rental bookings failed");
    res.status(500).json({ error: "تعذر تحميل حجوزات الإيجار" });
  }
});

router.patch("/rental-bookings/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
  const id = Number.parseInt(req.params.id, 10);
  const storeId = Number(req.body?.storeId);
  const decision = String(req.body?.decision || "");
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(storeId) || storeId < 1
    || !["confirmed", "rejected", "preparing", "out", "returned"].includes(decision) || (decision === "rejected" && !reason)) {
    res.status(400).json({ error: "اختر خطوة صحيحة، وأدخل سبب الرفض عند رفض الطلب" }); return;
  }
  const connection = await pool.getConnection();
  let customer: { sessionId: string; orderId: number; customerName: string | null; customerPhone: string | null } | null = null;
  try {
    await connection.beginTransaction();
    const [storeRows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM stores WHERE id = ? AND owner_user_id = ? FOR UPDATE", [storeId, userId],
    );
    if (!storeRows[0]) { await connection.rollback(); res.status(403).json({ error: "لا تملك صلاحية إدارة هذا المتجر" }); return; }
    const [orderRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, status, session_id, customer_name, customer_phone FROM orders WHERE id = ? FOR UPDATE", [id],
    );
    const order = orderRows[0];
    if (!order) { await connection.rollback(); res.status(404).json({ error: "طلب الإيجار غير موجود" }); return; }
    const [items] = await connection.query<RowDataPacket[]>(
      "SELECT oi.product_id, oi.fulfillment_type, p.store_id FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?", [id],
    );
    if (!items.length || items.some((item) => item.fulfillment_type !== "rental" || Number(item.store_id) !== storeId)) {
      await connection.rollback(); res.status(403).json({ error: "لا تملك هذا الحجز أو أنه لا يخص منتجات تأجير متجرك فقط" }); return;
    }
    const currentStatus = String(order.status);
    const transitions: Record<string, string[]> = {
      rental_pending_confirmation: ["confirmed", "rejected"],
      rental_confirmed: ["preparing"],
      rental_preparing: ["out"],
      rental_out: ["returned"],
    };
    if (!transitions[currentStatus]?.includes(decision)) {
      await connection.rollback(); res.status(409).json({ error: "لا يمكن تنفيذ هذه الخطوة على حالة الحجز الحالية" }); return;
    }
    const statusByDecision: Record<string, string> = {
      confirmed: "rental_confirmed", rejected: "rental_rejected", preparing: "rental_preparing", out: "rental_out", returned: "rental_returned",
    };
    const status = statusByDecision[decision];
    const messages: Record<string, string> = {
      confirmed: "أكد صاحب المتجر توفر عنصر الإيجار.",
      rejected: `رفض صاحب المتجر طلب الإيجار. السبب: ${reason}`,
      preparing: "بدأ صاحب المتجر تجهيز عناصر الإيجار.",
      out: "سلّم صاحب المتجر عناصر الإيجار للعميل.",
      returned: "أكد صاحب المتجر استرجاع عناصر الإيجار.",
    };
    const message = messages[decision];
    await connection.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    await connection.query(
      "INSERT INTO order_status_events (order_id, status, message, actor_type) VALUES (?, ?, ?, 'store')", [id, status, message],
    );
    customer = { sessionId: String(order.session_id), orderId: id, customerName: order.customer_name ?? null, customerPhone: order.customer_phone ?? null };
    await connection.commit();
    res.json({ id, status, decision, reason: decision === "rejected" ? reason : null });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error, orderId: id, storeId }, "Vendor rental booking decision failed");
    res.status(500).json({ error: "تعذر تحديث حالة حجز الإيجار" });
  } finally {
    connection.release();
  }
  if (customer) {
    const decision = String(req.body?.decision || "");
    const notificationMessages: Record<string, { title: string; message: string }> = {
      confirmed: { title: "أكد المتجر توفر الإيجار", message: `تم تأكيد توفر عناصر الإيجار لطلبك رقم ${customer.orderId}.` },
      rejected: { title: "تعذر قبول حجز الإيجار", message: `تم رفض طلب الإيجار رقم ${customer.orderId}. السبب: ${reason}` },
      preparing: { title: "بدأ تجهيز الإيجار", message: `بدأ المتجر تجهيز عناصر الإيجار لطلبك رقم ${customer.orderId}.` },
      out: { title: "تم تسليم عنصر الإيجار", message: `سلّم المتجر عناصر الإيجار المرتبطة بطلبك رقم ${customer.orderId}.` },
      returned: { title: "تم استرجاع الإيجار", message: `أكد المتجر استرجاع عناصر الإيجار لطلبك رقم ${customer.orderId}.` },
    };
    const notification = notificationMessages[decision];
    if (!notification) return;
    await createCustomerNotification({
      sessionId: customer.sessionId,
      orderId: customer.orderId,
      type: "rental_booking_status",
      ...notification,
      customerName: customer.customerName ?? undefined,
      phone: customer.customerPhone ?? undefined,
    }).catch((error) => req.log.warn({ error, orderId: customer?.orderId }, "Rental decision notification failed"));
  }
});

function validDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

router.get("/rental-maintenance", async (req, res): Promise<void> => {
  try {
    const storeId = await authorizeStore(req, res);
    if (!storeId) return;
    const month = String(req.query.month || "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { res.status(400).json({ error: "الشهر غير صحيح" }); return; }
    const [year, monthNumber] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT b.id, b.product_id AS productId, p.name_ar AS productName, b.start_date AS startDate,
              b.end_date AS endDate, b.quantity, b.reason, b.created_at AS createdAt
       FROM rental_maintenance_blocks b INNER JOIN products p ON p.id = b.product_id
       WHERE p.store_id = ? AND p.fulfillment_type = 'rental' AND b.start_date < ? AND b.end_date >= ?
       ORDER BY b.start_date, p.name_ar`,
      [storeId, monthEnd, monthStart],
    );
    res.setHeader("Cache-Control", "no-store");
    res.json(rows.map((row) => ({ ...row, id: Number(row.id), productId: Number(row.productId), quantity: Number(row.quantity), createdAt: new Date(row.createdAt).toISOString() })));
  } catch (error) {
    req.log.error({ error }, "Vendor rental maintenance list failed");
    res.status(500).json({ error: "تعذر تحميل فترات الصيانة" });
  }
});

router.post("/rental-maintenance", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
  const storeId = Number(req.body?.storeId);
  const productId = Number(req.body?.productId);
  const startDate = req.body?.startDate;
  const endDate = req.body?.endDate;
  const quantity = Number(req.body?.quantity ?? 1);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (!Number.isInteger(storeId) || storeId < 1 || !Number.isInteger(productId) || productId < 1
    || !validDateOnly(startDate) || !validDateOnly(endDate) || endDate < startDate
    || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    res.status(400).json({ error: "تحقق من المنتج والتواريخ والكمية" }); return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const latest = addDateDays(today, 180);
  if (startDate < today || startDate > latest || endDate > addDateDays(startDate, 90)) {
    res.status(400).json({ error: "تُسجل الصيانة خلال الأشهر الستة القادمة ولمدة لا تتجاوز 90 يومًا" }); return;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [storeRows] = await connection.query<RowDataPacket[]>("SELECT id FROM stores WHERE id = ? AND owner_user_id = ? FOR UPDATE", [storeId, userId]);
    if (!storeRows[0]) { await connection.rollback(); res.status(403).json({ error: "لا تملك صلاحية إدارة هذا المتجر" }); return; }
    const [productRows] = await connection.query<RowDataPacket[]>("SELECT id, stock_quantity, rental_buffer_days, fulfillment_type FROM products WHERE id = ? AND store_id = ? FOR UPDATE", [productId, storeId]);
    const product = productRows[0];
    if (!product || product.fulfillment_type !== "rental") { await connection.rollback(); res.status(404).json({ error: "منتج الإيجار غير موجود في متجرك" }); return; }
    const stockQuantity = Math.max(1, Number(product.stock_quantity || 1));
    if (quantity > stockQuantity) { await connection.rollback(); res.status(409).json({ error: "كمية الصيانة أكبر من مخزون المنتج" }); return; }
    const bufferDays = Math.max(0, Math.min(14, Number(product.rental_buffer_days || 0)));
    const occupancy = await getRentalOccupancy(connection, productId, startDate, endDate, bufferDays, undefined, 0);
    if (occupancy.maxOccupiedQuantity + quantity > stockQuantity) {
      await connection.rollback(); res.status(409).json({ error: "تتعارض فترة الصيانة مع حجوزات أو صيانة مسجلة؛ اختر تواريخ أخرى" }); return;
    }
    const [insertResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO rental_maintenance_blocks (product_id, start_date, end_date, quantity, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)",
      [productId, startDate, endDate, quantity, reason || null, userId],
    );
    await connection.commit();
    res.status(201).json({ id: Number(insertResult.insertId), productId, startDate, endDate, quantity, reason: reason || null });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error, productId, storeId }, "Vendor rental maintenance create failed");
    res.status(500).json({ error: "تعذر تسجيل فترة الصيانة" });
  } finally { connection.release(); }
});

router.delete("/rental-maintenance/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
  const id = Number.parseInt(req.params.id, 10);
  const storeId = Number(req.query.storeId);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(storeId) || storeId < 1) { res.status(400).json({ error: "معرّف الصيانة أو المتجر غير صحيح" }); return; }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT b.id FROM rental_maintenance_blocks b INNER JOIN products p ON p.id = b.product_id INNER JOIN stores s ON s.id = p.store_id WHERE b.id = ? AND p.store_id = ? AND s.owner_user_id = ?",
      [id, storeId, userId],
    );
    if (!rows[0]) { res.status(404).json({ error: "فترة الصيانة غير موجودة ضمن متجرك" }); return; }
    await db.delete(rentalMaintenanceBlocksTable).where(eq(rentalMaintenanceBlocksTable.id, id));
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ error, blockId: id }, "Vendor rental maintenance delete failed");
    res.status(500).json({ error: "تعذر حذف فترة الصيانة" });
  }
});

router.patch("/rental-bookings/:id/change-requests/:requestId", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك المسجل" }); return; }
  const orderId = Number.parseInt(req.params.id, 10);
  const requestId = Number.parseInt(req.params.requestId, 10);
  const storeId = Number(req.body?.storeId);
  const decision = String(req.body?.decision || "");
  const responseNote = typeof req.body?.responseNote === "string" ? req.body.responseNote.trim().slice(0, 500) : "";
  if (!Number.isInteger(orderId) || orderId < 1 || !Number.isInteger(requestId) || requestId < 1
    || !Number.isInteger(storeId) || storeId < 1 || !["approve", "reject"].includes(decision)) {
    res.status(400).json({ error: "بيانات قرار الطلب غير صحيحة" }); return;
  }
  if (decision === "reject" && !responseNote) { res.status(400).json({ error: "أدخل سبب الرفض ليظهر للعميل" }); return; }
  const connection = await pool.getConnection();
  let customer: { sessionId: string; name: string; phone: string } | null = null;
  let outcome = "";
  let message = "";
  try {
    await connection.beginTransaction();
    const [storeRows] = await connection.query<RowDataPacket[]>("SELECT id FROM stores WHERE id = ? AND owner_user_id = ? FOR UPDATE", [storeId, userId]);
    if (!storeRows[0]) { await connection.rollback(); res.status(403).json({ error: "لا تملك صلاحية إدارة هذا المتجر" }); return; }
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT r.id AS request_id, r.request_type, r.requested_start_date, r.status AS request_status,
              o.status AS order_status, o.session_id, o.customer_name, o.customer_phone
       FROM booking_change_requests r INNER JOIN orders o ON o.id = r.booking_id
       WHERE r.id = ? AND r.booking_id = ? AND r.booking_type = 'rental' FOR UPDATE`, [requestId, orderId],
    );
    const request = rows[0];
    if (!request) { await connection.rollback(); res.status(404).json({ error: "طلب التغيير غير موجود" }); return; }
    if (request.request_status !== "pending") { await connection.rollback(); res.status(409).json({ error: "تمت مراجعة هذا الطلب مسبقًا" }); return; }
    if (!["rental_pending_confirmation", "rental_confirmed", "rental_preparing"].includes(String(request.order_status))) {
      await connection.rollback(); res.status(409).json({ error: "لا يمكن قبول أو رفض هذا الطلب بعد تسليم الإيجار أو انتهاءه" }); return;
    }
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT oi.id AS item_id, oi.product_id, oi.quantity, oi.rental_start_date, oi.rental_days, oi.rental_end_date,
              oi.fulfillment_type, p.store_id, p.stock_quantity, p.rental_buffer_days
       FROM order_items oi INNER JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? FOR UPDATE`, [orderId],
    );
    if (!items.length || items.some((item) => item.fulfillment_type !== "rental" || Number(item.store_id) !== storeId)) {
      await connection.rollback(); res.status(403).json({ error: "لا تملك هذا الحجز أو لا يخص الإيجار في متجرك فقط" }); return;
    }
    const requestType = String(request.request_type);
    if (requestType === "reschedule" && decision === "approve") {
      const newStart = String(request.requested_start_date).slice(0, 10);
      for (const item of items) {
        const rentalDays = Math.max(1, Number(item.rental_days || 1));
        const newEnd = addDateDays(newStart, rentalDays - 1);
        const stock = Math.max(1, Number(item.stock_quantity || 1));
        const buffer = Math.max(0, Math.min(14, Number(item.rental_buffer_days || 0)));
        const occupancy = await getRentalOccupancy(connection, Number(item.product_id), newStart, newEnd, buffer, orderId);
        if (occupancy.maxOccupiedQuantity + Number(item.quantity || 1) > stock) {
          await connection.rollback();
          res.status(409).json({ error: `لا يتوفر المخزون في ${occupancy.busiestDate || newStart} بعد احتساب الصيانة والحجوزات ومهلة التجهيز؛ لم يتغير الحجز.` });
          return;
        }
      }
    }
    const currentStatus = String(request.order_status);
    if (requestType === "cancel" && decision === "approve") {
      outcome = "rental_cancelled";
      message = `وافق المتجر على إلغاء حجز الإيجار رقم ${orderId} بناءً على طلب العميل. لا يوجد استرداد تلقائي؛ تُراجع التسوية المالية يدويًا.`;
      await connection.query("UPDATE orders SET status = 'rental_cancelled' WHERE id = ?", [orderId]);
    } else if (requestType === "reschedule" && decision === "approve") {
      const newStart = String(request.requested_start_date).slice(0, 10);
      for (const item of items) {
        const newEnd = addDateDays(newStart, Math.max(1, Number(item.rental_days || 1)) - 1);
        await connection.query("UPDATE order_items SET rental_start_date = ?, rental_end_date = ? WHERE id = ?", [newStart, newEnd, item.item_id]);
      }
      outcome = currentStatus;
      message = `وافق المتجر على نقل موعد الإيجار رقم ${orderId} إلى ${newStart}. لم يُجر النظام تعديلًا ماليًا تلقائيًا.`;
    } else {
      outcome = currentStatus;
      message = `رفض المتجر طلب ${requestType === "cancel" ? "إلغاء" : "تغيير موعد"} الإيجار رقم ${orderId}. السبب: ${responseNote}`;
    }
    await connection.query("UPDATE booking_change_requests SET status = ?, reviewed_by_user_id = ?, response_note = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
      [decision === "approve" ? "approved" : "rejected", userId, responseNote || null, requestId]);
    await connection.query("INSERT INTO order_status_events (order_id, status, message, actor_type) VALUES (?, ?, ?, 'store')", [orderId, outcome, message]);
    customer = { sessionId: String(request.session_id), name: String(request.customer_name || ""), phone: String(request.customer_phone || "") };
    await connection.commit();
    res.json({ orderId, requestId, requestStatus: decision === "approve" ? "approved" : "rejected", orderStatus: outcome, automaticPaymentAdjustment: false });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error, orderId, requestId }, "Rental change request decision failed");
    res.status(500).json({ error: "تعذر حفظ قرار طلب الإيجار" });
  } finally { connection.release(); }
  if (customer) await createCustomerNotification({
    sessionId: customer.sessionId, orderId,
    type: "rental_change_request_decision",
    title: outcome === "rental_cancelled" ? "تمت الموافقة على إلغاء الإيجار" : "تم تحديث طلب تغيير الإيجار",
    message,
    customerName: customer.name,
    phone: customer.phone,
  }).catch((error) => req.log.warn({ error, orderId }, "Rental change decision notification failed"));
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
