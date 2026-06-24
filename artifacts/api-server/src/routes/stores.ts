import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, insertStoreSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const stores = await db.select().from(storesTable).orderBy(storesTable.id);
    res.json(stores);
  } catch (err) {
    req.log.error({ err }, "Failed to list stores");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const stores = await db.select().from(storesTable).where(eq(storesTable.isFeatured, true));
    res.json(stores);
  } catch (err) {
    req.log.error({ err }, "Failed to list featured stores");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, id));
    if (!store) return res.status(404).json({ error: "Store not found" });
    res.json(store);
  } catch (err) {
    req.log.error({ err }, "Failed to get store");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = insertStoreSchema.parse(req.body);
    const [store] = await db.insert(storesTable).values(data).returning();
    res.status(201).json(store);
  } catch (err) {
    req.log.error({ err }, "Failed to create store");
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
