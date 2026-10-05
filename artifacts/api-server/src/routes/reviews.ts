import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, productsTable, insertReviewSchema } from "@workspace/db";
import { eq, avg, count, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.query.productId as string);
    if (!productId) {
      res.status(400).json({ error: "productId required" });
      return;
    }
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId)).orderBy(desc(reviewsTable.createdAt));
    res.json(reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const data = insertReviewSchema.parse(req.body);
    await db.insert(reviewsTable).values(data);
    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, data.productId)).orderBy(desc(reviewsTable.id)).limit(1);
    if (!review) { res.status(400).json({ error: "تعذر إنشاء المراجعة" }); return; }

    const [stats] = await db.select({
      avgRating: avg(reviewsTable.rating),
      reviewCount: count(reviewsTable.id),
    }).from(reviewsTable).where(eq(reviewsTable.productId, data.productId));

    if (stats.avgRating) {
      await db.update(productsTable).set({
        rating: parseFloat(Number(stats.avgRating).toFixed(1)),
        reviewCount: Number(stats.reviewCount),
      }).where(eq(productsTable.id, data.productId));
    }

    res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create review");
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
