import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db, pool } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable, usersTable, productsTable, storesTable, rewardTransactionsTable, paymentWalletsTable, orderStatusEventsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, asc, sql, and, or, inArray } from "drizzle-orm";
import { createCustomerNotification, createPartnerNotification } from "../lib/notifications";
import { appendOrderStatusEvent } from "../lib/order-tracking";
import { authenticatedUserId } from "../lib/user-session";
import { deliveryQuote } from "../lib/delivery-pricing";

const router = Router();

const ENGAGEMENT_BOX_OFFER = {
  offerId: "engagement-box-medium-60x40",
  titleAr: "صندوق خطوبة وسط",
  descriptionAr: "عرض صندوق خطوبة متوسط بقياس 60×40 سم، مع رسالة إهداء خاصة.",
  dimensions: "60×40 سم",
  price: 45000,
  paymentOptions: ["partial", "full"],
} as const;

router.get("/offer", (_req, res): void => {
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(ENGAGEMENT_BOX_OFFER);
});

function maskPaymentReference(reference: string | null): string | null {
  if (!reference) return null;
  const value = reference.trim();
  if (!value) return null;
  return value.length <= 4 ? value : `••••${value.slice(-4)}`;
}

async function buildOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return { ...order, items, createdAt: order.createdAt.toISOString() };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "انتهت صلاحية الجلسة؛ سجّل الدخول مجددًا" });
      return;
    }
    const orders = await db.select().from(ordersTable)
      .where(or(eq(ordersTable.userId, userId), eq(ordersTable.sessionId, String(userId))))
      .orderBy(desc(ordersTable.createdAt));
    const result = await Promise.all(orders.map(buildOrder));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mine", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "انتهت صلاحية الجلسة؛ سجّل الدخول مجددًا" });
      return;
    }
    const orders = await db.select().from(ordersTable)
      .where(or(eq(ordersTable.userId, userId), eq(ordersTable.sessionId, String(userId))))
      .orderBy(desc(ordersTable.createdAt)).limit(100);
    res.setHeader("Cache-Control", "no-store");
    res.json(await Promise.all(orders.map(buildOrder)));
  } catch (err) {
    req.log.error({ err }, "Failed to list authenticated customer orders");
    res.status(500).json({ error: "تعذر تحميل الطلبات" });
  }
});

router.get("/:id/tracking", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const userId = await authenticatedUserId(req);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "معرّف الطلب غير صحيح" });
      return;
    }
    if (!userId) {
      res.status(401).json({ error: "انتهت صلاحية الجلسة؛ سجّل الدخول مجددًا" });
      return;
    }

    const [order] = await db.select().from(ordersTable).where(
      and(eq(ordersTable.id, id), or(eq(ordersTable.userId, userId), eq(ordersTable.sessionId, String(userId)))),
    );
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود لهذا الحساب" });
      return;
    }

    const history = await db.select().from(orderStatusEventsTable)
      .where(eq(orderStatusEventsTable.orderId, id))
      .orderBy(asc(orderStatusEventsTable.createdAt), asc(orderStatusEventsTable.id));
    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    const rentalItems = orderItems.filter((item) => item.fulfillmentType === "rental" && item.rentalStartDate && item.rentalEndDate);
    const rentalReturnDate = rentalItems.map((item) => item.rentalEndDate!).sort().at(-1) ?? null;
    res.setHeader("Cache-Control", "no-store");
    res.json({
      orderId: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      updatedAt: (history.at(-1)?.createdAt ?? order.createdAt).toISOString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentAmount: order.paymentAmount,
      transactionReference: maskPaymentReference(order.transactionReference),
      paymentReceiptUrl: order.paymentReceiptUrl,
      driverName: order.driverName,
      driverPhone: order.driverPhone,
      rental: rentalReturnDate ? {
        returnDate: rentalReturnDate,
        startDate: rentalItems.map((item) => item.rentalStartDate!).sort()[0],
        days: rentalItems.reduce((sum, item) => sum + (item.rentalDays ?? 1), 0),
        deposit: order.rentalDeposit,
        depositStatus: order.rentalDepositStatus,
        refundedAmount: order.rentalDepositRefunded,
        damageDeduction: order.rentalDamageDeduction,
        lateFee: order.rentalLateFee,
        depositReason: order.rentalDepositReason,
        processedAt: order.rentalDepositProcessedAt?.toISOString() ?? null,
        reminder: rentalReturnDate < new Date().toISOString().slice(0, 10) ? "overdue" : rentalReturnDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? "tomorrow" : null,
      } : null,
      history: history.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load order tracking");
    res.status(500).json({ error: "تعذر تحميل تتبع الطلب" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لعرض الطلب" });
      return;
    }
    const [order] = await db.select().from(ordersTable).where(
      and(eq(ordersTable.id, id), or(eq(ordersTable.userId, userId), eq(ordersTable.sessionId, String(userId)))),
    );
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const {
      sessionId, deliveryAddress, deliveryLatitude, deliveryLongitude, customerName, customerPhone,
      driverName, driverPhone,
      paymentMethod, paymentType, paymentWalletId, paymentAmount, transactionReference, paymentReceiptUrl, couponCode, notes, userId,
      isGift, giftRecipientName, giftMessage, giftCardStyle, hidePrice, scheduledDelivery,
    } = req.body;

    const authenticatedId = await authenticatedUserId(req);
    if (userId != null && (!authenticatedId || Number(userId) !== authenticatedId)) {
      res.status(403).json({ error: "لا يمكن إنشاء طلب باسم مستخدم آخر" });
      return;
    }
    const effectiveUserId = authenticatedId;

    if (!sessionId || !customerName || !customerPhone) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const normalizedPaymentType = paymentType ?? "cash_on_delivery";
    const requestedPaymentAmount = paymentAmount == null ? 0 : Number(paymentAmount);
    if (!["cash_on_delivery", "full", "partial"].includes(normalizedPaymentType)) {
      res.status(400).json({ error: "نوع الدفع غير صحيح" });
      return;
    }
    if (normalizedPaymentType !== "cash_on_delivery" && (!paymentWalletId || !transactionReference || !paymentReceiptUrl)) {
      res.status(400).json({ error: "يجب اختيار المحفظة وإرفاق رقم العملية والإيصال" });
      return;
    }

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    if (cartItems.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }
    if (cartItems.some((item) => item.fulfillmentType === "rental")) {
      res.status(409).json({ error: "حجوزات القاعات وتأجير الكوش والطاولات لها مسار حجز مباشر ولا تمر عبر السلة" });
      return;
    }
    const hasRentalItems = cartItems.some((item) => item.fulfillmentType === "rental");
    const needsDelivery = !hasRentalItems || cartItems.some((item) => item.rentalFulfillment === "delivery");
    if (needsDelivery && (!deliveryAddress || typeof deliveryLatitude !== "number" || typeof deliveryLongitude !== "number" || deliveryLatitude < 15.1 || deliveryLatitude > 15.7 || deliveryLongitude < 43.8 || deliveryLongitude > 44.6)) {
      res.status(400).json({ error: "موقع التوصيل غير صحيح أو خارج نطاق صنعاء" });
      return;
    }
    const initialStatus = hasRentalItems ? "rental_pending_confirmation" : "received";

    const subtotal = cartItems.reduce((sum, item) => {
      const days = item.fulfillmentType === "rental" ? Math.max(1, item.rentalDays ?? 1) : 1;
      return sum + item.price * item.quantity * days;
    }, 0);
    const rentalDeposit = cartItems.reduce((sum, item) => sum + item.rentalDeposit * item.quantity, 0);
    const deliveryFee = needsDelivery
      ? (typeof deliveryLatitude === "number" && typeof deliveryLongitude === "number"
        ? (await deliveryQuote(deliveryLatitude, deliveryLongitude)).fee
        : 0)
      : 0;
    const total = subtotal + rentalDeposit + deliveryFee;
    if (normalizedPaymentType !== "cash_on_delivery") {
      if (!Number.isFinite(requestedPaymentAmount) || requestedPaymentAmount <= 0 || requestedPaymentAmount > total) {
        res.status(400).json({ error: "مبلغ الدفع غير صحيح" });
        return;
      }
      const [wallet] = await db.select({ id: paymentWalletsTable.id }).from(paymentWalletsTable)
        .where(and(eq(paymentWalletsTable.id, Number(paymentWalletId)), eq(paymentWalletsTable.isActive, true)));
      if (!wallet) {
        res.status(400).json({ error: "المحفظة المختارة غير متاحة" });
        return;
      }
      if (typeof paymentReceiptUrl !== "string" || paymentReceiptUrl.length > 7 * 1024 * 1024) {
        res.status(400).json({ error: "حجم الإيصال أكبر من الحد المسموح" });
        return;
      }
    }
    const actualPaymentAmount = normalizedPaymentType === "full" ? total : requestedPaymentAmount;
    const paymentStatus = normalizedPaymentType === "cash_on_delivery" ? "unpaid" : "pending_review";

    await db.insert(ordersTable).values({
      sessionId,
      userId: effectiveUserId,
      status: initialStatus,
      total,
      subtotal,
      deliveryFee,
      discount: 0,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      customerName,
      customerPhone,
      driverName: driverName ?? null,
      driverPhone: driverPhone ?? null,
      paymentMethod: paymentMethod ?? "cash_on_delivery",
      paymentType: normalizedPaymentType,
      paymentStatus,
      paymentWalletId: paymentWalletId ?? null,
      paymentAmount: actualPaymentAmount,
      remainingAmount: Math.max(0, total - actualPaymentAmount),
      rentalDeposit,
      transactionReference: transactionReference ?? null,
      paymentReceiptUrl: paymentReceiptUrl ?? null,
      couponCode: couponCode ?? null,
      notes: notes ?? null,
      isGift: isGift ?? false,
      giftRecipientName: giftRecipientName ?? null,
      giftMessage: giftMessage ?? null,
      giftCardStyle: giftCardStyle ?? null,
      hidePrice: hidePrice ?? false,
      scheduledDelivery: scheduledDelivery ? new Date(scheduledDelivery) : null,
    });
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, sessionId)).orderBy(desc(ordersTable.id)).limit(1);
    if (!order) { res.status(500).json({ error: "تعذر إنشاء الطلب" }); return; }
    if (normalizedPaymentType !== "cash_on_delivery") {
      await db.insert(walletTransactionsTable).values({
        orderId: order.id,
        walletId: Number(paymentWalletId),
        kind: "payment",
        status: "pending_review",
        amount: actualPaymentAmount,
        currency: "YER",
        provider: "manual_local_wallet",
        externalId: transactionReference ?? null,
        idempotencyKey: `payment:${order.id}`,
        reason: "دفعة مرتبطة بإيصال التحويل",
      });
    }
    await appendOrderStatusEvent(order.id, initialStatus);
    const [recipient] = effectiveUserId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, effectiveUserId)) : [];
    await createCustomerNotification({
      sessionId,
      orderId: order.id,
      type: "order_received",
      title: hasRentalItems ? "تم استلام طلب الإيجار" : "تم استلام طلبك",
      message: hasRentalItems ? `تم استلام طلب الإيجار رقم ${order.id} وسنراجع التوفر والتفاصيل قريباً.` : `تم استلام الطلب رقم ${order.id} وسنبدأ بتجهيزه قريباً.`,
      customerName,
      phone: customerPhone,
      email: recipient?.email,
    });

    for (const item of cartItems) {
      await db.insert(orderItemsTable).values({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        fulfillmentType: item.fulfillmentType,
        rentalStartDate: item.rentalStartDate,
        rentalDays: item.rentalDays,
        rentalEndDate: item.rentalEndDate,
        rentalDeposit: item.rentalDeposit,
        rentalFulfillment: item.rentalFulfillment,
        rentalTimeSlot: item.rentalTimeSlot,
        imageUrl: item.imageUrl,
      });
    }

    const productIds = [...new Set(cartItems.map((item) => item.productId).filter((id) => Number.isInteger(id) && id > 0))];
    if (productIds.length > 0) {
      const owners = await db.select({ ownerUserId: storesTable.ownerUserId })
        .from(productsTable)
        .innerJoin(storesTable, eq(productsTable.storeId, storesTable.id))
        .where(inArray(productsTable.id, productIds));
      const ownerIds = [...new Set(owners.map((owner) => owner.ownerUserId).filter((id): id is number => id !== null && Number.isInteger(id) && id > 0))];
      await Promise.all(ownerIds.map((ownerUserId) => createPartnerNotification({
        recipientUserId: ownerUserId,
        bookingType: "product",
        bookingId: order.id,
        type: "product_order_created",
        title: "طلب منتج جديد",
        message: `وصل طلب جديد رقم ${order.id} ويحتوي على منتج من متجرك؛ راجع تفاصيل الطلب وابدأ التجهيز.`,
      }).catch((error) => req.log.warn({ error, orderId: order.id, ownerUserId }, "Partner product notification failed"))));
    }

    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

    if (effectiveUserId) {
      const points = Math.floor(total / 1000) * 10;
      if (points > 0) {
        const [currentUser] = await db.select({ rewardPoints: usersTable.rewardPoints })
          .from(usersTable).where(eq(usersTable.id, effectiveUserId));
        if (currentUser) {
          await db.update(usersTable)
            .set({
              rewardPoints: currentUser.rewardPoints + points,
              totalSpent: sql`${usersTable.totalSpent} + ${total}`,
            })
            .where(eq(usersTable.id, effectiveUserId));
          await db.insert(rewardTransactionsTable).values({
            userId: effectiveUserId,
            points,
            description: `نقاط طلب رقم ${order.id}`,
            orderId: order.id,
          });
        }
      }
    }

    res.status(201).json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/offer", async (req, res): Promise<void> => {
  try {
  const body = req.body as Record<string, unknown>;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim().slice(0, 1000) : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 200) : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim().slice(0, 40) : "";
  const giftRecipientName = typeof body.giftRecipientName === "string" ? body.giftRecipientName.trim().slice(0, 200) : "";
  const giftMessage = typeof body.giftMessage === "string" ? body.giftMessage.trim().slice(0, 1000) : "";
  const transactionReference = typeof body.transactionReference === "string" ? body.transactionReference.trim().slice(0, 120) : "";
  const paymentReceiptUrl = typeof body.paymentReceiptUrl === "string" ? body.paymentReceiptUrl.trim() : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const deliveryLatitude = body.deliveryLatitude;
  const deliveryLongitude = body.deliveryLongitude;
  const paymentType = body.paymentType;
  const paymentWalletId = Number(body.paymentWalletId);
  const requestedPaymentAmount = Number(body.paymentAmount);
  const authenticatedId = await authenticatedUserId(req);
  if (body.userId != null && (!authenticatedId || Number(body.userId) !== authenticatedId)) {
    res.status(403).json({ error: "لا يمكن إنشاء طلب باسم مستخدم آخر" }); return;
  }
  const effectiveUserId = authenticatedId;

  if (!sessionId || sessionId.length > 255 || !deliveryAddress || !customerName || !customerPhone || !giftMessage) {
    res.status(400).json({ error: "يرجى إدخال بيانات العميل والعنوان ورسالة الهدية" }); return;
  }
  if (typeof deliveryLatitude !== "number" || typeof deliveryLongitude !== "number" || deliveryLatitude < 15.1 || deliveryLatitude > 15.7 || deliveryLongitude < 43.8 || deliveryLongitude > 44.6) {
    res.status(400).json({ error: "موقع التوصيل غير صحيح أو خارج نطاق صنعاء" }); return;
  }
  if (!["full", "partial"].includes(String(paymentType))) {
    res.status(400).json({ error: "عرض الهدية يقبل الدفع الجزئي أو الكامل فقط" }); return;
  }
  if (!Number.isInteger(paymentWalletId) || paymentWalletId < 1 || !transactionReference || !paymentReceiptUrl) {
    res.status(400).json({ error: "يرجى اختيار المحفظة وإدخال رقم العملية وإرفاق الإيصال" }); return;
  }
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    res.status(400).json({ error: "مفتاح الطلب غير صالح؛ حدّث التطبيق وحاول مجددًا" }); return;
  }
  if (paymentReceiptUrl.length > 2048) { res.status(400).json({ error: "رابط إيصال الدفع غير صالح" }); return; }
  let receipt: URL;
  try { receipt = new URL(paymentReceiptUrl); } catch { res.status(400).json({ error: "رابط إيصال الدفع غير صالح" }); return; }
  if (!["http:", "https:"].includes(receipt.protocol) || !receipt.pathname.startsWith("/uploads/receipts/")) {
    res.status(400).json({ error: "يجب رفع صورة الإيصال من داخل التطبيق" }); return;
  }
  const expectedAmount = paymentType === "full" ? ENGAGEMENT_BOX_OFFER.price : Math.ceil(ENGAGEMENT_BOX_OFFER.price / 2);
  if (!Number.isFinite(requestedPaymentAmount) || requestedPaymentAmount !== expectedAmount) {
    res.status(400).json({ error: "مبلغ الدفع لا يطابق نوع الدفع المختار" }); return;
  }
  const [wallet] = await db.select({ id: paymentWalletsTable.id }).from(paymentWalletsTable)
    .where(and(eq(paymentWalletsTable.id, paymentWalletId), eq(paymentWalletsTable.isActive, true)));
  if (!wallet) { res.status(400).json({ error: "المحفظة المختارة غير متاحة" }); return; }

  const connection = await pool.getConnection();
  let orderId = 0;
  try {
    await connection.beginTransaction();
    if (idempotencyKey) {
      const [priorRows] = await connection.query<RowDataPacket[]>(
        "SELECT id, session_id, user_id FROM orders WHERE engagement_offer_key = ? LIMIT 1 FOR UPDATE",
        [idempotencyKey],
      );
      const prior = priorRows[0];
      if (prior) {
        if (String(prior.session_id) !== sessionId || Number(prior.user_id ?? 0) !== Number(effectiveUserId ?? 0)) {
          await connection.rollback();
          res.status(409).json({ error: "مفتاح الطلب مستخدم مسبقًا" }); return;
        }
        orderId = Number(prior.id);
        await connection.commit();
        const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
        if (!existing) { res.status(500).json({ error: "تعذر استرجاع طلب العرض" }); return; }
        res.status(200).json(await buildOrder(existing)); return;
      }
    }

    const [insertResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders
       (session_id, user_id, status, total, subtotal, delivery_fee, discount, delivery_address, delivery_latitude, delivery_longitude,
        customer_name, customer_phone, payment_method, payment_type, payment_status, payment_wallet_id, payment_amount, remaining_amount,
        transaction_reference, payment_receipt_url, notes, is_gift, gift_recipient_name, gift_message, hide_price, engagement_offer_key)
       VALUES (?, ?, 'received', ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?, ?, ?, TRUE, ?, ?, FALSE, ?)`,
      [sessionId, effectiveUserId, ENGAGEMENT_BOX_OFFER.price, ENGAGEMENT_BOX_OFFER.price, deliveryAddress, deliveryLatitude, deliveryLongitude,
        customerName, customerPhone, `wallet_${paymentWalletId}`, paymentType, paymentWalletId, expectedAmount,
        Math.max(0, ENGAGEMENT_BOX_OFFER.price - expectedAmount), transactionReference, paymentReceiptUrl,
        `طلب عرض ${ENGAGEMENT_BOX_OFFER.titleAr} مقاس ${ENGAGEMENT_BOX_OFFER.dimensions}`, giftRecipientName || null, giftMessage, idempotencyKey || null],
    );
    orderId = Number(insertResult.insertId);
    if (!orderId) throw new Error("Offer order insert did not return an ID");
    await connection.query(
      "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url) VALUES (?, 0, ?, ?, 1, ?)",
      [orderId, `${ENGAGEMENT_BOX_OFFER.titleAr} ${ENGAGEMENT_BOX_OFFER.dimensions}`, ENGAGEMENT_BOX_OFFER.price, "offer://facebook-khitbah-offer"],
    );
    await connection.query(
      "INSERT INTO wallet_transactions (order_id, wallet_id, kind, status, amount, currency, provider, external_id, idempotency_key, reason) VALUES (?, ?, 'payment', 'pending_review', ?, 'YER', 'manual_local_wallet', ?, ?, ?)",
      [orderId, paymentWalletId, expectedAmount, transactionReference, `payment:${orderId}`, "دفعة عرض صندوق الخطوبة مرتبطة بإيصال التحويل"],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    if (idempotencyKey && (error as { code?: string }).code === "ER_DUP_ENTRY") {
      const [prior] = await db.select().from(ordersTable).where(eq(ordersTable.engagementOfferKey, idempotencyKey));
      if (prior && prior.sessionId === sessionId && Number(prior.userId ?? 0) === Number(effectiveUserId ?? 0)) {
        res.status(200).json(await buildOrder(prior)); return;
      }
      res.status(409).json({ error: "مفتاح الطلب مستخدم مسبقًا" }); return;
    }
    req.log.error({ error }, "Failed to create offer order");
    res.status(500).json({ error: "تعذر إنشاء طلب العرض" }); return;
  } finally {
    connection.release();
  }

  await appendOrderStatusEvent(orderId, "received");
  const [recipient] = effectiveUserId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, effectiveUserId)) : [];
  await createCustomerNotification({ sessionId, orderId, type: "order_received", title: "تم استلام طلب العرض", message: `تم استلام طلب عرض صندوق الخطوبة رقم ${orderId} وسنراجعه قريباً.`, customerName, phone: customerPhone, email: recipient?.email });
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(500).json({ error: "تعذر استرجاع طلب العرض" }); return; }
  res.status(201).json(await buildOrder(order));
  } catch (error) {
    req.log.error({ error }, "Failed to prepare engagement box offer order");
    if (!res.headersSent) res.status(500).json({ error: "تعذر إنشاء طلب العرض" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status, driverName, driverPhone } = req.body ?? {};
    const allowedStatuses = ["received", "preparing", "delivering", "delivered", "cancelled"];
    if (!Number.isInteger(id) || id < 1 || !allowedStatuses.includes(status)) {
      res.status(400).json({ error: "حالة الطلب أو رقمه غير صحيح" });
      return;
    }

    const [previous] = await db.select({ status: ordersTable.status }).from(ordersTable).where(eq(ordersTable.id, id));
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
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (previous.status !== status) await appendOrderStatusEvent(id, status, "store");
    res.json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
