import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, insertProductSchema } from "@workspace/db";
import { eq, and, like, desc, sql } from "drizzle-orm";

const router = Router();

function parseProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    tags: JSON.parse(p.tags || "[]"),
    occasionTags: JSON.parse(p.occasionTags || "[]"),
    offerEndsAt: p.offerEndsAt ? p.offerEndsAt.toISOString() : null,
  };
}

router.get("/featured", async (req, res): Promise<void> => {
  try {
    const products = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get featured products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/new-arrivals", async (req, res): Promise<void> => {
  try {
    const products = await db.select().from(productsTable).where(eq(productsTable.isNew, true)).orderBy(desc(productsTable.id)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get new arrivals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/top-sanaa", async (req, res): Promise<void> => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.reviewCount)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get top Sanaa products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/best-sellers", async (req, res): Promise<void> => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.salesCount)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get best sellers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/most-viewed", async (req, res): Promise<void> => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.views)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get most viewed products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/by-occasion", async (req, res): Promise<void> => {
  try {
    const occasion = req.query.tag as string;
    if (!occasion) {
      res.status(400).json({ error: "tag required" });
      return;
    }
    const products = await db.select().from(productsTable)
      .where(like(productsTable.occasionTags, `%${occasion}%`))
      .limit(20);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get products by occasion");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recommendations", async (req, res): Promise<void> => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const products = await db.select().from(productsTable)
      .orderBy(desc(productsTable.rating))
      .limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get recommendations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res): Promise<void> => {
  try {
    const { categoryId, storeId, search, featured, limit } = req.query;
    const conditions = [];

    if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId as string)));
    if (storeId) conditions.push(eq(productsTable.storeId, parseInt(storeId as string)));
    if (featured === "true") conditions.push(eq(productsTable.isFeatured, true));
    if (search) conditions.push(like(productsTable.nameAr, `%${search}%`));

    const products = conditions.length > 0
      ? await db.select().from(productsTable).where(and(...conditions)).limit(limit ? parseInt(limit as string) : 50)
      : await db.select().from(productsTable).limit(limit ? parseInt(limit as string) : 50);

    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    // Increment view count
    await db.update(productsTable).set({ views: sql`${productsTable.views} + 1` }).where(eq(productsTable.id, id));
    res.json(parseProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const data = insertProductSchema.parse(req.body);
    const [product] = await db.insert(productsTable).values(data).returning();
    res.status(201).json(parseProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(parseProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
