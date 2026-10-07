import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable, orderItemsTable, ordersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();
const DELIVERY_FEE = 500;

function isRental(product: typeof productsTable.$inferSelect): boolean {
  return product.fulfillmentType === "rental";
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function endDate(start: string, days: number): string {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days - 1);
  return date.toISOString().slice(0, 10);
}

function lineTotal(item: typeof cartItemsTable.$inferSelect): number {
  const days = item.fulfillmentType === "rental" ? Math.max(1, item.rentalDays ?? 1) : 1;
  return item.price * item.quantity * days;
}

async function rentalQuantityInUse(productId: number, startDate: string, endDate: string): Promise<number> {
  const rows = await db.select({ item: orderItemsTable, order: ordersTable })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(and(eq(orderItemsTable.productId, productId), eq(orderItemsTable.fulfillmentType, "rental")));
  const ignoredStatuses = new Set(["cancelled", "canceled", "refunded", "rejected", "expired"]);
  return rows.reduce((total, row) => {
    const itemStart = row.item.rentalStartDate;
    const itemEnd = row.item.rentalEndDate;
    if (!itemStart || !itemEnd || ignoredStatuses.has(row.order.status)) return total;
    return itemStart <= endDate && itemEnd >= startDate ? total + row.item.quantity : total;
  }, 0);
}

async function buildCart(sessionId: string) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
  const normalizedItems = items.map((item) => ({ ...item, lineTotal: lineTotal(item) }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const rentalDeposit = items.reduce((sum, item) => sum + item.rentalDeposit * item.quantity, 0);
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + rentalDeposit + deliveryFee;
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
    const { sessionId, productId, quantity, giftWrapping, giftMessage, rentalStartDate, rentalDays } = req.body;
    if (!sessionId || !productId || !Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({ error: "بيانات المنتج أو الكمية غير صحيحة" });
      return;
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId)));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (!product.inStock || (product.stockQuantity != null && product.stockQuantity < quantity)) {
      res.status(400).json({ error: "الكمية المطلوبة غير متوفرة حاليًا" });
      return;
    }

    const rental = isRental(product);
    const days = rental ? Number(rentalDays) : null;
    if (rental) {
      if (!validDate(rentalStartDate) || !Number.isInteger(days) || days! < product.rentalMinDays || days! > product.rentalMaxDays) {
        res.status(400).json({ error: `اختر تاريخ بداية ومدة بين ${product.rentalMinDays} و${product.rentalMaxDays} أيام` });
        return;
      }
      if (!product.rentalDailyPrice || product.rentalDailyPrice <= 0) {
        res.status(400).json({ error: "سعر الإيجار غير مهيأ لهذا العنصر" });
        return;
      }
      const requestedEndDate = endDate(rentalStartDate, days!);
      const reserved = await rentalQuantityInUse(Number(productId), rentalStartDate, requestedEndDate);
      const availableQuantity = product.stockQuantity ?? 1;
      if (reserved + quantity > availableQuantity) {
        res.status(409).json({ error: "العنصر محجوز في جزء من هذه المدة؛ اختر تاريخًا أو كمية أخرى" });
        return;
      }
    }

    const price = rental ? product.rentalDailyPrice! : (product.discountPrice ?? product.price);
    const rentalEndDate = rental ? endDate(rentalStartDate, days!) : null;
    const existing = await db.select().from(cartItemsTable).where(
      and(
        eq(cartItemsTable.sessionId, sessionId),
        eq(cartItemsTable.productId, Number(productId)),
        rental ? eq(cartItemsTable.rentalStartDate, rentalStartDate) : isNull(cartItemsTable.rentalStartDate),
        rental ? eq(cartItemsTable.rentalDays, days!) : isNull(cartItemsTable.rentalDays),
      ),
    );

    if (existing[0]) {
      await db.update(cartItemsTable).set({ quantity: existing[0].quantity + quantity }).where(eq(cartItemsTable.id, existing[0].id));
    } else {
      await db.insert(cartItemsTable).values({
        sessionId,
        productId: Number(productId),
        productName: product.nameAr,
        price,
        quantity,
        fulfillmentType: rental ? "rental" : "sale",
        rentalStartDate: rental ? rentalStartDate : null,
        rentalDays: rental ? days : null,
        rentalEndDate,
        rentalDeposit: rental ? product.rentalDeposit : 0,
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
    const itemId = parseInt(req.params.itemId);
    const { quantity } = req.body;
    const [current] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    if (!current) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    if (!Number.isInteger(quantity)) {
      res.status(400).json({ error: "الكمية غير صحيحة" });
      return;
    }
    if (quantity <= 0) await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    else await db.update(cartItemsTable).set({ quantity }).where(eq(cartItemsTable.id, itemId));
    res.json(await buildCart(current.sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to update cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:itemId", async (req, res): Promise<void> => {
  try {
    const itemId = parseInt(req.params.itemId);
    const [item] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    res.json(await buildCart(item.sessionId));
  } catch (err) {
    req.log.error({ err }, "Failed to remove cart item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
