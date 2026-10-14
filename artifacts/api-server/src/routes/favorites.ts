import { Router } from "express";
import { db } from "@workspace/db";
import { favoritesTable, productsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();

function parseProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    tags: JSON.parse(p.tags || "[]"),
    occasionTags: JSON.parse(p.occasionTags || "[]"),
  };
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لعرض المفضلة" });
      return;
    }

    const favs = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId));
    const productIds = favs.map((f) => f.productId);

    if (productIds.length === 0) {
      res.json([]);
      return;
    }

    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "List favorites failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    const { productId } = req.body;
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لتعديل المفضلة" });
      return;
    }
    if (!Number.isInteger(Number(productId)) || Number(productId) < 1) {
      res.status(400).json({ error: "بيانات مفقودة" });
      return;
    }
    const normalizedProductId = Number(productId);

    const [existing] = await db.select().from(favoritesTable).where(
      and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, normalizedProductId))
    );

    if (existing) {
      await db.delete(favoritesTable).where(eq(favoritesTable.id, existing.id));
      res.json({ isFavorite: false });
      return;
    }

    await db.insert(favoritesTable).values({ userId, productId: normalizedProductId });
    res.json({ isFavorite: true });
  } catch (err) {
    req.log.error({ err }, "Toggle favorite failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
