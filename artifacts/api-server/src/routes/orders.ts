import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable, usersTable, rewardTransactionsTable, paymentWalletsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { createCustomerNotification } from "../lib/notifications";

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

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    if (cartItems.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + DELIVERY_FEE;
    const normalizedPaymentType = paymentType ?? "cash_on_delivery";
    const requestedPaymentAmount = paymentAmount == null ? 0 : Number(paymentAmount);
    if (!["cash_on_delivery", "full", "partial"].includes(normalizedPaymentType)) {
      res.status(400).json({ error: "نوع الدفع غير صحيح" });
      return;
    }
    if (normalizedPaymentType !== "cash_on_delivery") {
      if (!paymentWalletId || !transactionReference || !paymentReceiptUrl) {
        res.status(400).json({ error: "يجب اختيار المحفظة وإرفاق رقم العملية والإيصال" });
        return;
      }
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

    const [order] = await db.insert(ordersTable).values({
      sessionId,
      userId: userId ?? null,
      status: "received",
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
    }).returning();
    const [recipient] = userId ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, Number(userId))) : [];
    await createCustomerNotification({
      sessionId,
      orderId: order.id,
      type: "order_received",
      title: "تم استلام طلبك",
      message: `تم استلام الطلب رقم ${order.id} وسنبدأ بتجهيزه قريباً.`,
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

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status, driverName, driverPhone } = req.body;
    if (!status) {
      res.status(400).json({ error: "status required" });
      return;
    }

    const [order] = await db.update(ordersTable).set({
      status,
      driverName: driverName === undefined ? undefined : (driverName || null),
      driverPhone: driverPhone === undefined ? undefined : (driverPhone || null),
    }).where(eq(ordersTable.id, id)).returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
