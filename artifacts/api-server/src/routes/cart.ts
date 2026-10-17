import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();
const DELIVERY_FEE = 500;
const MAX_CART_QUANTITY = 99;

function lineTotal(item: typeof cartItemsTable.$inferSelect): number {
  return item.price * item.quantity;
}

async function buildCart(sessionId: string) {
  const savedItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
  const legacyRentalItems = savedItems.filter((item) => item.fulfillmentType === "rental");
  for (const item of legacyRentalItems) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, item.id));
  }
  const items = savedItems.filter((item) => item.fulfillmentType !== "rental");
  const normalizedItems = items.map((item) => ({ ...item, lineTotal: lineTotal(item) }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const rentalDeposit = 0;
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  return {
    sessionId,
    items: normalizedItems,
    subtotal,
    rentalDeposit,
    deliveryFee,
    discount: 0,
    total,
    couponCode: null,
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to get cart");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const { sessionId, productId, quantity, giftWrapping, giftMessage } = req.body;
    if (!sessionId || !productId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      res.status(400).json({ error: "بيانات المنتج أو الكمية غير صحيحة" });
      return;
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId)));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.fulfillmentType === "rental") {
      res.status(409).json({ error: "تأجير الكوش والطاولات يتم بحجز مباشر، ولا يُضاف إلى السلة" });
      return;
    }
    if (!product.inStock || (product.stockQuantity != null && product.stockQuantity < quantity)) {
      res.status(400).json({ error: "الكمية المطلوبة غير متوفرة حاليًا" });
      return;
    }

    const price = product.discountPrice ?? product.price;
    const existing = await db.select().from(cartItemsTable).where(
      and(
        eq(cartItemsTable.sessionId, sessionId),
        eq(cartItemsTable.productId, Number(productId)),
        isNull(cartItemsTable.rentalStartDate),
        isNull(cartItemsTable.rentalDays),
      ),
    );
    const updatedQuantity = (existing[0]?.quantity ?? 0) + quantity;
    if (
      !Number.isSafeInteger(updatedQuantity) ||
      updatedQuantity > MAX_CART_QUANTITY ||
      (product.stockQuantity != null && product.stockQuantity < updatedQuantity)
    ) {
      res.status(400).json({ error: "الكمية المطلوبة تتجاوز المتاح أو الحد المسموح" });
      return;
    }

    if (existing[0]) {
      await db.update(cartItemsTable).set({ quantity: updatedQuantity }).where(eq(cartItemsTable.id, existing[0].id));
    } else {
      await db.insert(cartItemsTable).values({
        sessionId,
        productId: Number(productId),
        productName: product.nameAr,
        price,
        quantity,
        fulfillmentType: "sale",
        rentalStartDate: null,
        rentalDays: null,
        rentalEndDate: null,
        rentalDeposit: 0,
        rentalFulfillment: null,
        rentalTimeSlot: null,
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

router.patch("/:itemId", async (req, res): Promise<void> => {
  try {
    const itemId = Number.parseInt(req.params.itemId, 10);
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const { quantity } = req.body;
    if (!Number.isSafeInteger(itemId) || itemId < 1 || !sessionId || sessionId.length > 200) {
      res.status(400).json({ error: "بيانات السلة غير صحيحة" });
      return;
    }
    const [current] = await db.select().from(cartItemsTable).where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId)),
    );
    if (!current) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      res.status(400).json({ error: `يجب أن تكون الكمية بين 1 و${MAX_CART_QUANTITY}` });
      return;
    }
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, current.productId));
    if (!product || !product.inStock || (product.stockQuantity != null && product.stockQuantity < quantity)) {
      res.status(400).json({ error: "الكمية المطلوبة غير متوفرة حاليًا" });
      return;
    }
    await db.update(cartItemsTable).set({ quantity }).where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId)),
    );
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to update cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:itemId", async (req, res): Promise<void> => {
  try {
    const itemId = Number.parseInt(req.params.itemId, 10);
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    if (!Number.isSafeInteger(itemId) || itemId < 1 || !sessionId || sessionId.length > 200) {
      res.status(400).json({ error: "بيانات السلة غير صحيحة" });
      return;
    }
    const [item] = await db.select().from(cartItemsTable).where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId)),
    );
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    await db.delete(cartItemsTable).where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId)),
    );
    res.json(await buildCart(sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to remove cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
