import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, productsTable, insertReviewSchema } from "@workspace/db";
import { eq, avg, count, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const productId = parseInt(req.query.productId as string);
    if (!productId) return res.status(400).json({ error: "productId required" });
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId)).orderBy(desc(reviewsTable.createdAt));
    res.json(reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = insertReviewSchema.parse(req.body);
    const [review] = await db.insert(reviewsTable).values(data).returning();

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
