import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notificationsTable, partnerNotificationsTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";

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

router.get("/partner", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "سجّل الدخول لعرض إشعارات الشريك" }); return; }
  try {
    const rows = await db.select().from(partnerNotificationsTable)
      .where(eq(partnerNotificationsTable.recipientUserId, userId))
      .orderBy(desc(partnerNotificationsTable.createdAt)).limit(50);
    res.setHeader("Cache-Control", "no-store");
    res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    req.log.error({ error, userId }, "Partner notifications load failed");
    res.status(500).json({ error: "تعذر تحميل إشعارات الشريك" });
  }
});

router.patch("/partner/:id/read", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  const id = Number.parseInt(req.params.id, 10);
  if (!userId) { res.status(401).json({ error: "انتهت الجلسة؛ سجّل الدخول مجددًا" }); return; }
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "رقم الإشعار غير صحيح" }); return; }
  try {
    const result = await db.update(partnerNotificationsTable).set({ isRead: true })
      .where(and(eq(partnerNotificationsTable.id, id), eq(partnerNotificationsTable.recipientUserId, userId)));
    const [row] = await db.select({ id: partnerNotificationsTable.id }).from(partnerNotificationsTable)
      .where(and(eq(partnerNotificationsTable.id, id), eq(partnerNotificationsTable.recipientUserId, userId)));
    if (!row) { res.status(404).json({ error: "الإشعار غير موجود" }); return; }
    void result;
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ error, userId, notificationId: id }, "Partner notification read update failed");
    res.status(500).json({ error: "تعذر تحديث الإشعار" });
  }
});

export default router;
