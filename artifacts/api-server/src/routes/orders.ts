import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable, usersTable, rewardTransactionsTable, paymentWalletsTable, orderStatusEventsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, asc, sql, and, or } from "drizzle-orm";
import { createCustomerNotification } from "../lib/notifications";
import { appendOrderStatusEvent } from "../lib/order-tracking";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();

const DELIVERY_FEE = 500;

async function buildOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return { ...order, items, createdAt: order.createdAt.toISOString() };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, sessionId)).orderBy(desc(ordersTable.createdAt));
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
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
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

    if (!sessionId || !deliveryAddress || !customerName || !customerPhone) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (typeof deliveryLatitude !== "number" || typeof deliveryLongitude !== "number" || deliveryLatitude < 15.1 || deliveryLatitude > 15.7 || deliveryLongitude < 43.8 || deliveryLongitude > 44.6) {
      res.status(400).json({ error: "موقع التوصيل غير صحيح أو خارج نطاق صنعاء" });
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
    const hasRentalItems = cartItems.some((item) => item.fulfillmentType === "rental");
    const initialStatus = hasRentalItems ? "rental_pending_confirmation" : "received";

    const subtotal = cartItems.reduce((sum, item) => {
      const days = item.fulfillmentType === "rental" ? Math.max(1, item.rentalDays ?? 1) : 1;
      return sum + item.price * item.quantity * days;
    }, 0);
    const rentalDeposit = cartItems.reduce((sum, item) => sum + item.rentalDeposit * item.quantity, 0);
    const total = subtotal + rentalDeposit + DELIVERY_FEE;
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
      userId: userId ?? null,
      status: initialStatus,
      total,
      subtotal,
      deliveryFee: DELIVERY_FEE,
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
    const [recipient] = userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, Number(userId))) : [];
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
        imageUrl: item.imageUrl,
      });
    }

    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

    if (userId) {
      const points = Math.floor(total / 1000) * 10;
      if (points > 0) {
        const [currentUser] = await db.select({ rewardPoints: usersTable.rewardPoints })
          .from(usersTable).where(eq(usersTable.id, userId));
        if (currentUser) {
          await db.update(usersTable)
            .set({
              rewardPoints: currentUser.rewardPoints + points,
              totalSpent: sql`${usersTable.totalSpent} + ${total}`,
            })
            .where(eq(usersTable.id, userId));
          await db.insert(rewardTransactionsTable).values({
            userId,
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
    const {
      sessionId, deliveryAddress, deliveryLatitude, deliveryLongitude, customerName, customerPhone,
      paymentMethod, paymentType, paymentWalletId, paymentAmount, transactionReference, paymentReceiptUrl,
      userId, giftRecipientName, giftMessage,
    } = req.body;
    const OFFER_TOTAL = 45000;
    if (!sessionId || !deliveryAddress || !customerName || !customerPhone || !giftMessage) {
      res.status(400).json({ error: "يرجى إدخال بيانات العميل والعنوان ورسالة الهدية" }); return;
    }
    if (typeof deliveryLatitude !== "number" || typeof deliveryLongitude !== "number" || deliveryLatitude < 15.1 || deliveryLatitude > 15.7 || deliveryLongitude < 43.8 || deliveryLongitude > 44.6) {
      res.status(400).json({ error: "موقع التوصيل غير صحيح أو خارج نطاق صنعاء" }); return;
    }
    const normalizedPaymentType = paymentType;
    const requestedPaymentAmount = paymentAmount == null ? 0 : Number(paymentAmount);
    if (!["full", "partial"].includes(normalizedPaymentType)) { res.status(400).json({ error: "عرض الهدية يقبل الدفع الجزئي أو الكامل فقط" }); return; }
    if (!paymentWalletId || !transactionReference || !paymentReceiptUrl) { res.status(400).json({ error: "يرجى اختيار المحفظة وإدخال رقم العملية وإرفاق الإيصال" }); return; }
    const expectedAmount = normalizedPaymentType === "full" ? OFFER_TOTAL : Math.ceil(OFFER_TOTAL / 2);
    if (!Number.isFinite(requestedPaymentAmount) || requestedPaymentAmount !== expectedAmount) { res.status(400).json({ error: "مبلغ الدفع لا يطابق نوع الدفع المختار" }); return; }
    const [wallet] = await db.select({ id: paymentWalletsTable.id }).from(paymentWalletsTable).where(and(eq(paymentWalletsTable.id, Number(paymentWalletId)), eq(paymentWalletsTable.isActive, true)));
    if (!wallet) { res.status(400).json({ error: "المحفظة المختارة غير متاحة" }); return; }
    if (typeof paymentReceiptUrl !== "string" || paymentReceiptUrl.length > 7 * 1024 * 1024) { res.status(400).json({ error: "حجم الإيصال أكبر من الحد المسموح" }); return; }
    await db.insert(ordersTable).values({
      sessionId, userId: userId ?? null, status: "received", total: OFFER_TOTAL, subtotal: OFFER_TOTAL, deliveryFee: 0, discount: 0,
      deliveryAddress, deliveryLatitude, deliveryLongitude, customerName, customerPhone,
      paymentMethod: paymentMethod ?? `wallet_${paymentWalletId}`, paymentType: normalizedPaymentType, paymentStatus: "pending_review",
      paymentWalletId: Number(paymentWalletId), paymentAmount: expectedAmount, remainingAmount: Math.max(0, OFFER_TOTAL - expectedAmount),
      transactionReference, paymentReceiptUrl, notes: "طلب عرض صندوق خطوبة وسط مقاس 60×40",
      isGift: true, giftRecipientName: giftRecipientName || null, giftMessage, hidePrice: false,
    });
    const [created] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.sessionId, sessionId)).orderBy(desc(ordersTable.id)).limit(1);
    if (!created) { res.status(500).json({ error: "تعذر إنشاء طلب العرض" }); return; }
    const orderId = created.id;
    await appendOrderStatusEvent(orderId, "received");
    await db.insert(orderItemsTable).values({ orderId, productId: 0, productName: "عرض صندوق خطوبة وسط 60×40", price: OFFER_TOTAL, quantity: 1, imageUrl: "offer://facebook-khitbah-offer" });
    const [recipient] = userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, Number(userId))) : [];
    await createCustomerNotification({ sessionId, orderId, type: "order_received", title: "تم استلام طلب العرض", message: `تم استلام طلب عرض صندوق الخطوبة رقم ${orderId} وسنراجعه قريباً.`, customerName, phone: customerPhone, email: recipient?.email });
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    res.status(201).json(await buildOrder(order));
  } catch (err) { req.log.error({ err }, "Failed to create offer order"); res.status(500).json({ error: "تعذر إنشاء طلب العرض" }); }
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
