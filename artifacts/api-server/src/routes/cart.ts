import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const DELIVERY_FEE = 500;

async function buildCart(sessionId: string) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (items.length > 0 ? DELIVERY_FEE : 0);
  return {
    sessionId,
    items,
    subtotal,
    deliveryFee: items.length > 0 ? DELIVERY_FEE : 0,
    discount: 0,
    total,
    couponCode: null,
  };
}

router.get("/", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to get cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { sessionId, productId, quantity, giftWrapping, giftMessage } = req.body;
    if (!sessionId || !productId || !quantity) return res.status(400).json({ error: "Missing required fields" });

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) return res.status(404).json({ error: "Product not found" });

    const price = product.discountPrice ?? product.price;

    const [existing] = await db.select().from(cartItemsTable).where(
      and(eq(cartItemsTable.sessionId, sessionId), eq(cartItemsTable.productId, productId))
    );

    if (existing) {
      await db.update(cartItemsTable).set({ quantity: existing.quantity + quantity }).where(eq(cartItemsTable.id, existing.id));
    } else {
      await db.insert(cartItemsTable).values({
        sessionId,
        productId,
        productName: product.nameAr,
        price,
        quantity,
        imageUrl: product.imageUrl,
        giftWrapping: giftWrapping ?? false,
        giftMessage: giftMessage ?? null,
      });
    }

    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to add to cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { quantity } = req.body;
    if (quantity <= 0) {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    } else {
      await db.update(cartItemsTable).set({ quantity }).where(eq(cartItemsTable.id, itemId));
    }
    const [item] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    const sessionId = item?.sessionId ?? req.body.sessionId;
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to update cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const [item] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    if (!item) return res.status(404).json({ error: "Item not found" });
    const sessionId = item.sessionId;
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to remove cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
