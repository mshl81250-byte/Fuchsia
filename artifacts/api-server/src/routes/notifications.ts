import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";

const router = Router();

router.get("/", async (req, res): Promise<void> => {
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }
  try {
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.sessionId, sessionId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(notifications.map(notification => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "تعذر تحميل الإشعارات" });
  }
});

router.patch("/:id/read", async (req, res): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10);
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  if (!Number.isInteger(id) || !sessionId) {
    res.status(400).json({ error: "بيانات الإشعار غير صحيحة" });
    return;
  }
  try {
    await db.update(notificationsTable).set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.sessionId, sessionId)));
    const [notification] = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.sessionId, sessionId)));
    if (!notification) {
      res.status(404).json({ error: "الإشعار غير موجود" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "تعذر تحديث الإشعار" });
  }
});

router.patch("/read-all", async (req, res): Promise<void> => {
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }
  try {
    await db.update(notificationsTable).set({ isRead: true })
      .where(and(eq(notificationsTable.sessionId, sessionId), eq(notificationsTable.isRead, false)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all notifications read");
    res.status(500).json({ error: "تعذر تحديث الإشعارات" });
  }
});

export default router;
