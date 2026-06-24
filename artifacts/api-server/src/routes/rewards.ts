import { Router } from "express";
import { db } from "@workspace/db";
import { rewardTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });

    const [user] = await db.select({ rewardPoints: usersTable.rewardPoints })
      .from(usersTable).where(eq(usersTable.id, userId));

    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    const transactions = await db.select().from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(20);

    res.json({
      userId,
      points: user.rewardPoints,
      pointsValue: user.rewardPoints * 2,
      transactions: transactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Get rewards failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
