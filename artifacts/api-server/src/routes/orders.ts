import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const DELIVERY_FEE = 500;

async function buildOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return { ...order, items, createdAt: order.createdAt.toISOString() };
}

router.get("/", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.sessionId, sessionId)).orderBy(desc(ordersTable.createdAt));
    const result = await Promise.all(orders.map(buildOrder));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { sessionId, deliveryAddress, customerName, customerPhone, paymentMethod, couponCode, notes } = req.body;
    if (!sessionId || !deliveryAddress || !customerName || !customerPhone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + DELIVERY_FEE;

    const [order] = await db.insert(ordersTable).values({
      sessionId,
      status: "received",
      total,
      deliveryFee: DELIVERY_FEE,
      discount: 0,
      deliveryAddress,
      customerName,
      customerPhone,
      paymentMethod: paymentMethod ?? "cash_on_delivery",
      couponCode: couponCode ?? null,
      notes: notes ?? null,
    }).returning();

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

    res.status(201).json(await buildOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
