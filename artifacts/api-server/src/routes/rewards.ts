import { Router } from "express";
import { db } from "@workspace/db";
import { rewardTransactionsTable, usersTable, spinHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const SPIN_PRIZES = [
  { reward: "نقاط مكافأة", value: "50", probability: 30 },
  { reward: "نقاط مكافأة", value: "100", probability: 20 },
  { reward: "خصم", value: "10%", probability: 20 },
  { reward: "شحن مجاني", value: "1", probability: 15 },
  { reward: "نقاط مكافأة", value: "200", probability: 10 },
  { reward: "خصم", value: "20%", probability: 4 },
  { reward: "نقاط مكافأة", value: "500", probability: 1 },
];

function spinWheel() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const prize of SPIN_PRIZES) {
    cumulative += prize.probability;
    if (rand <= cumulative) return prize;
  }
  return SPIN_PRIZES[0];
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      res.status(400).json({ error: "userId مطلوب" });
      return;
    }

    const [user] = await db.select({
      rewardPoints: usersTable.rewardPoints,
      tier: usersTable.tier,
      totalSpent: usersTable.totalSpent,
      lastSpinDate: usersTable.lastSpinDate,
    }).from(usersTable).where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    const transactions = await db.select().from(rewardTransactionsTable)
      .where(eq(rewardTransactionsTable.userId, userId))
      .orderBy(desc(rewardTransactionsTable.createdAt))
      .limit(20);

    res.json({
      userId,
      points: user.rewardPoints,
      pointsValue: user.rewardPoints * 2,
      tier: user.tier,
      totalSpent: user.totalSpent,
      lastSpinDate: user.lastSpinDate,
      transactions: transactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Get rewards failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/spin", async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId مطلوب" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    if (user.lastSpinDate === today) {
      res.status(429).json({ error: "لقد استخدمت دورتك اليومية، حاول غداً!" });
      return;
    }

    const prize = spinWheel();

    await db.update(usersTable).set({ lastSpinDate: today }).where(eq(usersTable.id, userId));

    await db.insert(spinHistoryTable).values({
      userId,
      spinDate: today,
      reward: prize.reward,
      rewardValue: prize.value,
    });

    if (prize.reward === "نقاط مكافأة") {
      const points = parseInt(prize.value);
      await db.update(usersTable)
        .set({ rewardPoints: user.rewardPoints + points })
        .where(eq(usersTable.id, userId));
      await db.insert(rewardTransactionsTable).values({
        userId,
        points,
        description: `جائزة العجلة: ${points} نقطة`,
      });
    }

    res.json({ reward: prize.reward, value: prize.value });
  } catch (err) {
    req.log.error({ err }, "Spin wheel failed");
    res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
