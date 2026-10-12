import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { and, eq } from "drizzle-orm";
import { db, paymentWalletsTable, pool, usersTable, storesTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";
import { createCustomerNotification, createPartnerNotification } from "../lib/notifications";
import { addDateDays, getRentalOccupancy } from "../lib/rental-availability";

const router = Router();
const DELIVERY_FEE = 500;
const MAX_LEAD_DAYS = 180;

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days - 1);
  return date.toISOString().slice(0, 10);
}

function validateReceiptUrl(value: unknown): string {
  if (typeof value !== "string") throw new RequestError(400, "أرفق إيصال التحويل من داخل التطبيق");
  let receipt: URL;
  try { receipt = new URL(value); } catch { throw new RequestError(400, "رابط إيصال التحويل غير صحيح"); }
  if (!['http:', 'https:'].includes(receipt.protocol) || !receipt.pathname.startsWith("/uploads/receipts/")) {
    throw new RequestError(400, "يجب رفع صورة الإيصال من داخل التطبيق");
  }
  return value;
}

function serializeOrder(row: RowDataPacket) {
  return {
    id: Number(row.id),
    status: String(row.status),
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    rentalDeposit: Number(row.rental_deposit),
    paymentAmount: Number(row.payment_amount),
    paymentStatus: String(row.payment_status),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

router.get("/availability", async (req, res): Promise<void> => {
  try {
    const productId = Number(req.query.productId);
    const startDate = req.query.startDate;
    const days = Number(req.query.days);
    if (!Number.isInteger(productId) || productId < 1 || !isDateOnly(startDate)
      || !Number.isInteger(days) || days < 1 || days > 30) {
      res.status(400).json({ error: "تحقق من المنتج وتاريخ بداية الإيجار ومدته" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const latestDate = new Date();
    latestDate.setUTCDate(latestDate.getUTCDate() + MAX_LEAD_DAYS);
    if (startDate < today || startDate > latestDate.toISOString().slice(0, 10)) {
      res.status(400).json({ error: "اختر تاريخًا من اليوم وحتى الأشهر الستة القادمة" });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, fulfillment_type, is_published, in_stock, stock_quantity, rental_daily_price, rental_min_days, rental_max_days, rental_buffer_days FROM products WHERE id = ? LIMIT 1",
      [productId],
    );
    const product = rows[0];
    if (!product || product.fulfillment_type !== "rental" || !product.is_published) {
      res.status(404).json({ error: "عنصر الإيجار غير متاح" });
      return;
    }
    if (!product.in_stock || Number(product.rental_daily_price) <= 0
      || days < Number(product.rental_min_days) || days > Number(product.rental_max_days)) {
      res.status(409).json({ error: "المدة أو حالة توفر هذا العنصر لا تسمح بالحجز" });
      return;
    }

    const endDate = addDays(startDate, days);
    const stockQuantity = Math.max(1, Number(product.stock_quantity ?? 1));
    const bufferDays = Math.max(0, Math.min(14, Number(product.rental_buffer_days || 0)));
    const occupancy = await getRentalOccupancy(pool, productId, startDate, endDate, bufferDays);
    const reserved = occupancy.maxReservedQuantity;
    const maintenance = occupancy.maxMaintenanceQuantity;
    const available = Math.max(0, stockQuantity - occupancy.maxOccupiedQuantity);
    const requestedQuantity = req.query.quantity == null ? null : Number(req.query.quantity);
    if (requestedQuantity != null && (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 1000)) {
      res.status(400).json({ error: "الكمية المطلوبة غير صحيحة" }); return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ productId, startDate, endDate, blockedThrough: occupancy.blockedThrough, bufferDays, stockQuantity, reservedQuantity: reserved, maintenanceQuantity: maintenance, availableQuantity: available, canBook: requestedQuantity == null ? available > 0 : available >= requestedQuantity, busiestDate: occupancy.busiestDate });
  } catch (error) {
    req.log.error({ error }, "Failed to check rental availability");
    res.status(500).json({ error: "تعذر التحقق من توفر الإيجار" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const productId = Number(body.productId);
  const startDate = body.rentalStartDate;
  const days = Number(body.rentalDays);
  const quantity = Number(body.quantity);
  const fulfillment = body.rentalFulfillment;
  const timeSlot = body.rentalTimeSlot;
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const paymentType = body.paymentType === "full" ? "full" : body.paymentType === "partial" ? "partial" : "";
  const paymentAmount = Number(body.paymentAmount);
  const paymentWalletId = Number(body.paymentWalletId);
  const transactionReference = typeof body.transactionReference === "string" ? body.transactionReference.trim().slice(0, 120) : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  let paymentReceiptUrl = "";

  if (!sessionId || sessionId.length > 255 || !Number.isInteger(productId) || productId < 1
    || !isDateOnly(startDate) || !Number.isInteger(days) || days < 1 || days > 30
    || !Number.isInteger(quantity) || quantity < 1 || !["pickup", "delivery"].includes(String(fulfillment))
    || !["morning", "evening"].includes(String(timeSlot))) {
    res.status(400).json({ error: "تحقق من تفاصيل عنصر الإيجار والتاريخ والمدة والكمية" });
    return;
  }
  if (!customerName || customerName.length > 200 || !customerPhone || customerPhone.length > 40) {
    res.status(400).json({ error: "يرجى إدخال اسم العميل ورقم هاتفه" });
    return;
  }
  if (!paymentType || !Number.isFinite(paymentAmount) || paymentAmount <= 0
    || !Number.isInteger(paymentWalletId) || paymentWalletId < 1 || !transactionReference) {
    res.status(400).json({ error: "لحجز الإيجار اختر دفع العربون أو المبلغ الكامل وأدخل بيانات التحويل" });
    return;
  }
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    res.status(400).json({ error: "مفتاح الحجز غير صالح؛ حدّث التطبيق وحاول مجددًا" });
    return;
  }
  try { paymentReceiptUrl = validateReceiptUrl(body.paymentReceiptUrl); }
  catch (error) {
    const requestError = error instanceof RequestError ? error : new RequestError(400, "إيصال التحويل غير صالح");
    res.status(requestError.status).json({ error: requestError.message });
    return;
  }

  const userId = await authenticatedUserId(req);
  const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim().slice(0, 1000) : "";
  const latitude = body.deliveryLatitude == null ? null : Number(body.deliveryLatitude);
  const longitude = body.deliveryLongitude == null ? null : Number(body.deliveryLongitude);
  if (fulfillment === "delivery" && (!deliveryAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude! < 15.1 || latitude! > 15.7 || longitude! < 43.8 || longitude! > 44.6)) {
    res.status(400).json({ error: "أدخل عنوانًا وحدد موقع التوصيل داخل صنعاء" });
    return;
  }

  const [wallet] = await db.select({ id: paymentWalletsTable.id }).from(paymentWalletsTable)
    .where(and(eq(paymentWalletsTable.id, paymentWalletId), eq(paymentWalletsTable.isActive, true)));
  if (!wallet) { res.status(400).json({ error: "وسيلة الدفع المختارة غير مفعلة" }); return; }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [priorRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, session_id, user_id, status, total, subtotal, delivery_fee, rental_deposit, payment_amount, payment_status, created_at FROM orders WHERE rental_booking_key = ? LIMIT 1 FOR UPDATE",
      [idempotencyKey],
    );
    if (priorRows[0]) {
      const prior = priorRows[0];
      if (String(prior.session_id) !== sessionId || Number(prior.user_id ?? 0) !== Number(userId ?? 0)) {
        throw new RequestError(409, "مفتاح الحجز مستخدم مسبقًا");
      }
      await connection.commit();
      res.status(200).json(serializeOrder(prior));
      return;
    }

    const [productRows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE id = ? AND is_published = TRUE FOR UPDATE",
      [productId],
    );
    const product = productRows[0];
    if (!product || product.fulfillment_type !== "rental") throw new RequestError(404, "عنصر الإيجار غير منشور أو غير موجود");
    if (!product.in_stock) throw new RequestError(409, "عنصر الإيجار غير متاح حاليًا");
    const dailyPrice = Number(product.rental_daily_price);
    const minimumDays = Number(product.rental_min_days || 1);
    const maximumDays = Number(product.rental_max_days || 3);
    const stockQuantity = Math.max(1, Number(product.stock_quantity ?? 1));
    if (!Number.isFinite(dailyPrice) || dailyPrice <= 0 || days < minimumDays || days > maximumDays) {
      throw new RequestError(409, "تغير سعر أو مدة الإيجار؛ أعد تحميل تفاصيل المنتج");
    }
    if (quantity > stockQuantity) throw new RequestError(409, "الكمية المطلوبة تتجاوز العدد المتاح من المالك");

    const today = new Date().toISOString().slice(0, 10);
    const latestDate = new Date();
    latestDate.setUTCDate(latestDate.getUTCDate() + MAX_LEAD_DAYS);
    if (startDate < today || startDate > latestDate.toISOString().slice(0, 10)) {
      throw new RequestError(400, "اختر تاريخًا من اليوم وحتى الأشهر الستة القادمة");
    }
    const endDate = addDays(startDate, days);
    const bufferDays = Math.max(0, Math.min(14, Number(product.rental_buffer_days || 0)));
    const occupancy = await getRentalOccupancy(connection, productId, startDate, endDate, bufferDays);
    if (occupancy.maxOccupiedQuantity + quantity > stockQuantity) {
      const occupiedDate = occupancy.busiestDate ? ` في ${occupancy.busiestDate}` : "";
      throw new RequestError(409, `الكمية المطلوبة غير متاحة${occupiedDate} بعد احتساب الحجوزات والصيانة ومهلة التجهيز`);
    }

    const subtotal = dailyPrice * days * quantity;
    const rentalDeposit = Number(product.rental_deposit || 0) * quantity;
    const deliveryFee = fulfillment === "delivery" ? DELIVERY_FEE : 0;
    const total = subtotal + rentalDeposit + deliveryFee;
    const expectedPayment = paymentType === "full" ? total : Math.ceil(total / 2);
    if (Math.abs(paymentAmount - expectedPayment) > 0.5) throw new RequestError(409, "تغير الإجمالي؛ راجع السعر ثم أعد المحاولة");

    const [insertResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders
       (session_id, user_id, status, total, subtotal, delivery_fee, discount, delivery_address, delivery_latitude, delivery_longitude,
        customer_name, customer_phone, payment_method, payment_type, payment_status, payment_wallet_id, payment_amount, remaining_amount,
        transaction_reference, payment_receipt_url, notes, rental_deposit, rental_booking_key)
       VALUES (?, ?, 'rental_pending_confirmation', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, total, subtotal, deliveryFee, fulfillment === "delivery" ? deliveryAddress : null,
        fulfillment === "delivery" ? latitude : null, fulfillment === "delivery" ? longitude : null,
        customerName, customerPhone, `wallet_${paymentWalletId}`, paymentType, paymentWalletId, expectedPayment,
        Math.max(0, total - expectedPayment), transactionReference, paymentReceiptUrl, notes || null, rentalDeposit, idempotencyKey],
    );
    const orderId = Number(insertResult.insertId);
    await connection.query(
      `INSERT INTO order_items
       (order_id, product_id, product_name, price, quantity, fulfillment_type, rental_start_date, rental_days, rental_end_date,
        rental_deposit, rental_fulfillment, rental_time_slot, image_url)
       VALUES (?, ?, ?, ?, ?, 'rental', ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, productId, String(product.name_ar), dailyPrice, quantity, startDate, days, endDate,
        Number(product.rental_deposit || 0), fulfillment, timeSlot, String(product.image_url)],
    );
    await connection.query(
      `INSERT INTO wallet_transactions
       (order_id, wallet_id, kind, status, amount, currency, provider, external_id, idempotency_key, reason)
       VALUES (?, ?, 'payment', 'pending_review', ?, 'YER', 'manual_local_wallet', ?, ?, 'دفعة مقدمة لحجز إيجار مباشر')`,
      [orderId, paymentWalletId, expectedPayment, transactionReference, `rental-payment:${idempotencyKey}`],
    );
    await connection.query(
      "INSERT INTO order_status_events (order_id, status, message, actor_type) VALUES (?, 'rental_pending_confirmation', 'تم استلام طلب الإيجار وبانتظار تأكيد التوفر.', 'system')",
      [orderId],
    );
    const [savedRows] = await connection.query<RowDataPacket[]>("SELECT id, session_id, user_id, status, total, subtotal, delivery_fee, rental_deposit, payment_amount, payment_status, created_at FROM orders WHERE id = ? LIMIT 1", [orderId]);
    await connection.commit();

    if (userId) {
      const [recipient] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      await createCustomerNotification({
        sessionId,
        orderId,
        type: "rental_booking_received",
        title: "تم استلام طلب حجز الإيجار",
        message: `تم استلام طلب حجز ${String(product.name_ar)} رقم ${orderId}. سنراجع التوفر وإيصال الدفع قريبًا.`,
        customerName,
        phone: customerPhone,
        email: recipient?.email,
      }).catch((error) => req.log.warn({ error, orderId }, "Rental booking notification failed"));
    }
    const [store] = await db.select({ ownerUserId: storesTable.ownerUserId }).from(storesTable).where(eq(storesTable.id, Number(product.store_id)));
    if (store?.ownerUserId) {
      await createPartnerNotification({
        recipientUserId: store.ownerUserId,
        bookingType: "rental",
        bookingId: orderId,
        type: "rental_booking_created",
        title: "طلب إيجار جديد",
        message: `وصل طلب إيجار جديد رقم ${orderId} لمنتج ${String(product.name_ar)}؛ راجع التوفر وإيصال الدفع.`,
      }).catch((error) => req.log.warn({ error, orderId }, "Partner rental booking notification failed"));
    }
    res.status(201).json(serializeOrder(savedRows[0]));
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    if (error instanceof RequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    req.log.error({ error }, "Failed to create direct rental booking");
    res.status(500).json({ error: "تعذر إرسال طلب حجز الإيجار" });
  } finally {
    connection.release();
  }
});

router.post("/:id/change-requests", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك لإرسال طلب تغيير الإيجار" }); return; }
  const orderId = Number.parseInt(req.params.id, 10);
  const requestType = String(req.body?.type || "");
  const requestedStartDate = req.body?.newStartDate;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (!Number.isInteger(orderId) || orderId < 1 || !["cancel", "reschedule"].includes(requestType)) {
    res.status(400).json({ error: "اختر طلبًا ونوع تغيير صحيحًا" }); return;
  }
  if (requestType === "reschedule" && !isDateOnly(requestedStartDate)) {
    res.status(400).json({ error: "اختر تاريخ بداية جديدًا بصيغة صحيحة" }); return;
  }
  if (requestType === "reschedule") {
    const today = new Date().toISOString().slice(0, 10);
    const latest = new Date(); latest.setUTCDate(latest.getUTCDate() + MAX_LEAD_DAYS);
    if (requestedStartDate < today || requestedStartDate > latest.toISOString().slice(0, 10)) {
      res.status(400).json({ error: "اختر تاريخًا من اليوم وحتى الأشهر الستة القادمة" }); return;
    }
  }
  const connection = await pool.getConnection();
  let requestId = 0;
  let storeOwnerId = 0;
  let customer: { name: string; phone: string; sessionId: string; status: string } | null = null;
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query<RowDataPacket[]>(
      "SELECT id, user_id, session_id, status, customer_name, customer_phone FROM orders WHERE id = ? AND user_id = ? FOR UPDATE", [orderId, userId],
    );
    const order = orders[0];
    if (!order) { await connection.rollback(); res.status(404).json({ error: "طلب الإيجار غير موجود لهذا الحساب" }); return; }
    const currentStatus = String(order.status);
    if (!["rental_pending_confirmation", "rental_confirmed", "rental_preparing"].includes(currentStatus)) {
      await connection.rollback(); res.status(409).json({ error: "لا يمكن طلب الإلغاء أو تغيير التاريخ بعد تسليم الإيجار أو انتهاء الطلب" }); return;
    }
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT oi.product_id, oi.fulfillment_type, oi.rental_start_date, oi.rental_days, p.store_id, s.owner_user_id
       FROM order_items oi INNER JOIN products p ON p.id = oi.product_id INNER JOIN stores s ON s.id = p.store_id
       WHERE oi.order_id = ?`, [orderId],
    );
    if (!items.length || items.some((item) => item.fulfillment_type !== "rental") || new Set(items.map((item) => Number(item.store_id))).size !== 1) {
      await connection.rollback(); res.status(409).json({ error: "لا يمكن تقديم طلب موحد لهذا الطلب؛ تواصل مع الدعم" }); return;
    }
    if (requestType === "reschedule" && items.every((item) => String(item.rental_start_date).slice(0, 10) === requestedStartDate)) {
      await connection.rollback(); res.status(400).json({ error: "التاريخ الجديد مطابق للتاريخ الحالي" }); return;
    }
    const [pending] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM booking_change_requests WHERE booking_type = 'rental' AND booking_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE", [orderId],
    );
    if (pending[0]) { await connection.rollback(); res.status(409).json({ error: "يوجد طلب قيد المراجعة لهذا الإيجار بالفعل" }); return; }
    const [inserted] = await connection.query<ResultSetHeader>(
      "INSERT INTO booking_change_requests (booking_type, booking_id, customer_user_id, request_type, requested_start_date, reason) VALUES ('rental', ?, ?, ?, ?, ?)",
      [orderId, userId, requestType, requestType === "reschedule" ? requestedStartDate : null, reason || null],
    );
    requestId = Number(inserted.insertId);
    const eventMessage = requestType === "cancel"
      ? `طلب العميل إلغاء الإيجار رقم ${orderId}؛ الحجز قائم حتى قرار المتجر ولا يوجد استرداد تلقائي.`
      : `طلب العميل تغيير تاريخ الإيجار رقم ${orderId} إلى ${requestedStartDate}؛ يبقى الموعد الأصلي قائمًا حتى موافقة المتجر.`;
    await connection.query("INSERT INTO order_status_events (order_id, status, message, actor_type) VALUES (?, ?, ?, 'customer')", [orderId, currentStatus, `${eventMessage}${reason ? ` السبب: ${reason}` : ""}`]);
    storeOwnerId = Number(items[0].owner_user_id || 0);
    customer = { name: String(order.customer_name || ""), phone: String(order.customer_phone || ""), sessionId: String(order.session_id), status: currentStatus };
    await connection.commit();
    if (storeOwnerId > 0) await createPartnerNotification({
      recipientUserId: storeOwnerId, bookingType: "rental", bookingId: orderId, requestId,
      type: requestType === "cancel" ? "rental_cancellation_request" : "rental_reschedule_request",
      title: requestType === "cancel" ? "طلب إلغاء إيجار" : "طلب تغيير موعد إيجار",
      message: requestType === "cancel"
        ? `طلب العميل إلغاء الإيجار رقم ${orderId}.${reason ? ` السبب: ${reason}` : ""}`
        : `طلب العميل تغيير موعد الإيجار رقم ${orderId} إلى ${requestedStartDate}.${reason ? ` السبب: ${reason}` : ""}`,
    }).catch((error) => req.log.warn({ error, orderId }, "Partner rental change request notification failed"));
    await createCustomerNotification({
      sessionId: customer.sessionId, orderId,
      type: requestType === "cancel" ? "rental_cancellation_requested" : "rental_reschedule_requested",
      title: "طلبك بانتظار موافقة المتجر",
      message: requestType === "cancel"
        ? `أُرسل طلب إلغاء الإيجار رقم ${orderId}. يبقى الحجز كما هو حتى قرار المتجر، ولا يتم استرداد مبلغ تلقائيًا.`
        : `أُرسل طلب تغيير موعد الإيجار رقم ${orderId}. يبقى الموعد الأصلي قائمًا حتى موافقة المتجر ولا يُعدّل المبلغ تلقائيًا.`,
      customerName: customer.name,
      phone: customer.phone,
    }).catch((error) => req.log.warn({ error, orderId }, "Customer rental change request notification failed"));
    res.status(201).json({ id: requestId, orderId, type: requestType, status: "pending", originalBookingKept: true, automaticPaymentAdjustment: false });
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    req.log.error({ error, orderId }, "Rental change request failed");
    res.status(500).json({ error: "تعذر إرسال طلب التغيير" });
  } finally { connection.release(); }
});

export default router;
