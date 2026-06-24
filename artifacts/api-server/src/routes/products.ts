import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, insertProductSchema, categoriesTable, storesTable } from "@workspace/db";
import { eq, and, like, desc } from "drizzle-orm";

const router = Router();

function parseProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    tags: JSON.parse(p.tags || "[]"),
  };
}

router.get("/featured", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get featured products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/new-arrivals", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).where(eq(productsTable.isNew, true)).orderBy(desc(productsTable.id)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get new arrivals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/top-sanaa", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.reviewCount)).limit(10);
    res.json(products.map(parseProduct));
  } catch (err) {
    req.log.error({ err }, "Failed to get top Sanaa products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { categoryId, storeId, search, featured, limit } = req.query;
    let query = db.select().from(productsTable);
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

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(parseProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = insertProductSchema.parse(req.body);
    const [product] = await db.insert(productsTable).values(data).returning();
    res.status(201).json(parseProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
