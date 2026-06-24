import { Router } from "express";
import { db } from "@workspace/db";
import { favoritesTable, productsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

function parseProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    tags: JSON.parse(p.tags || "[]"),
  };
}

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });

    const favs = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId));
    const productIds = favs.map((f) => f.productId);

    if (productIds.length === 0) return res.json([]);

    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "List favorites failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: "بيانات مفقودة" });

    const [existing] = await db.select().from(favoritesTable).where(
      and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId))
    );

    if (existing) {
      await db.delete(favoritesTable).where(eq(favoritesTable.id, existing.id));
      return res.json({ isFavorite: false });
    }

    await db.insert(favoritesTable).values({ userId, productId });
    res.json({ isFavorite: true });
  } catch (err) {
    req.log.error({ err }, "Toggle favorite failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
