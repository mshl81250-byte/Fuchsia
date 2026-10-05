import { Router } from "express";
import { db, paymentWalletsTable, insertPaymentWalletSchema } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/admin-auth";

const router = Router();
router.get("/", async (_req, res): Promise<void> => {
  try {
    const wallets = await db.select().from(paymentWalletsTable)
      .where(eq(paymentWalletsTable.isActive, true)).orderBy(asc(paymentWalletsTable.sortOrder));
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: "تعذر تحميل المحافظ" });
  }
});
router.get("/all", requireAdmin, async (_req, res): Promise<void> => {
  const wallets = await db.select().from(paymentWalletsTable).orderBy(asc(paymentWalletsTable.sortOrder));
  res.json(wallets);
});
router.post("/", requireAdmin, async (req, res): Promise<void> => {
  try {
    const data = insertPaymentWalletSchema.parse(req.body);
    const [wallet] = await db.insert(paymentWalletsTable).values(data).returning();
    res.status(201).json(wallet);
  } catch {
    res.status(400).json({ error: "بيانات المحفظة غير صحيحة" });
  }
});
router.patch("/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rawId = typeof req.params.id === "string" ? req.params.id : "";
    const id = Number.parseInt(rawId, 10);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "معرّف المحفظة غير صحيح" }); return; }
    const data = insertPaymentWalletSchema.partial().parse(req.body);
    const [wallet] = await db.update(paymentWalletsTable).set(data).where(eq(paymentWalletsTable.id, id)).returning();
    if (!wallet) { res.status(404).json({ error: "المحفظة غير موجودة" }); return; }
    res.json(wallet);
  } catch {
    res.status(400).json({ error: "تعذر تحديث المحفظة" });
  }
});
export default router;
