import { Router } from "express";
import { pool } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();
let tableReady: Promise<void> | null = null;

async function ensureTable() {
  if (!tableReady) {
    tableReady = pool.query(`CREATE TABLE IF NOT EXISTS support_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category VARCHAR(32) NOT NULL,
      subject VARCHAR(160) NULL,
      message TEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX support_messages_user_idx (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).then(() => undefined);
  }
  await tableReady;
}

router.post("/messages", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: "يلزم تسجيل الدخول لإرسال الرسالة" }); return; }
  const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim().slice(0, 160) : null;
  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 4000) : "";
  if (!["suggestion", "inquiry", "complaint"].includes(category) || message.length < 8) {
    res.status(400).json({ error: "اختر نوع الرسالة واكتب تفاصيل لا تقل عن 8 أحرف" }); return;
  }
  try {
    await ensureTable();
    const [result] = await pool.query<any>("INSERT INTO support_messages (user_id, category, subject, message) VALUES (?, ?, ?, ?)", [userId, category, subject || null, message]);
    res.status(201).json({ id: Number(result.insertId), message: "تم استلام رسالتك وسيراجعها فريق فوشيا" });
  } catch (error) {
    req.log.error({ error }, "Support message failed");
    res.status(500).json({ error: "تعذر إرسال الرسالة" });
  }
});

export default router;
