import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, storesTable, venueOwnersTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";
import { uploadPublicImage } from "../lib/object-storage";
import { requireAdmin } from "../lib/admin-auth";

const router = Router();
const uploadDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/receipts");
fs.mkdirSync(uploadDir, { recursive: true });
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 7 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype)),
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 7 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype)),
});

function verifiedImageType(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

router.post("/receipt", receiptUpload.single("receipt"), async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "يلزم تسجيل الدخول لرفع إيصال الدفع" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "أرفق صورة إيصال بصيغة JPG أو PNG أو WebP" });
    return;
  }
  const contentType = verifiedImageType(req.file.buffer);
  if (!contentType || contentType !== req.file.mimetype) {
    res.status(400).json({ error: "محتوى الصورة لا يطابق نوع الملف" });
    return;
  }
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  const filename = `${userId}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
  await fs.promises.writeFile(path.join(uploadDir, filename), req.file.buffer, { flag: "wx" });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(201).json({ url: `${baseUrl}/uploads/receipts/${filename}`, mimeType: contentType, size: req.file.size });
});

router.post("/admin-image", requireAdmin, imageUpload.single("image"), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "أرفق صورة JPG أو PNG أو WebP لا يتجاوز حجمها 7 ميغابايت" });
      return;
    }
    const contentType = verifiedImageType(req.file.buffer);
    if (!contentType || contentType !== req.file.mimetype) {
      res.status(400).json({ error: "محتوى الصورة لا يطابق نوع الملف" });
      return;
    }

    const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
    const key = `catalog/${crypto.randomUUID()}.${extension}`;
    const url = await uploadPublicImage({ key, body: req.file.buffer, contentType });
    res.status(201).json({ url, contentType, size: req.file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message.includes("Object storage is not configured")) {
      res.status(503).json({ error: "تخزين الصور الدائم غير مهيأ على الخادم بعد" });
      return;
    }
    req.log.error({ error }, "Admin image upload failed");
    res.status(502).json({ error: "تعذر رفع الصورة إلى خدمة التخزين" });
  }
});

router.post("/image", imageUpload.single("image"), async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) { res.status(401).json({ error: "سجّل الدخول بحسابك لرفع الصور" }); return; }
    if (!req.file) { res.status(400).json({ error: "أرفق صورة JPG أو PNG أو WebP لا يتجاوز حجمها 7 ميغابايت" }); return; }
    const contentType = verifiedImageType(req.file.buffer);
    if (!contentType || contentType !== req.file.mimetype) { res.status(400).json({ error: "محتوى الصورة لا يطابق نوع الملف" }); return; }

    const purpose = req.body?.purpose === "venue" ? "venue" : req.body?.purpose === "rental" ? "rental" : "";
    if (!purpose) { res.status(400).json({ error: "حدد نوع الصورة: venue أو rental" }); return; }
    let prefix: string;
    if (purpose === "venue") {
      const [owner] = await db.select({ id: venueOwnersTable.id, status: venueOwnersTable.status }).from(venueOwnersTable).where(eq(venueOwnersTable.userId, userId));
      if (!owner || owner.status !== "active") { res.status(403).json({ error: "رفع صور القاعات متاح لصاحب قاعة معتمد فقط" }); return; }
      prefix = `venues/${owner.id}`;
    } else {
      const storeIdValue = req.body?.storeId;
      const requestedStoreId = storeIdValue == null || String(storeIdValue).trim() === "" ? null : Number(storeIdValue);
      if (requestedStoreId !== null && (!Number.isInteger(requestedStoreId) || requestedStoreId < 1)) {
        res.status(400).json({ error: "معرّف المتجر غير صحيح" }); return;
      }
      const condition = requestedStoreId === null
        ? eq(storesTable.ownerUserId, userId)
        : and(eq(storesTable.id, requestedStoreId), eq(storesTable.ownerUserId, userId));
      const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(condition);
      if (!store) { res.status(403).json({ error: "رفع صور التأجير متاح لصاحب متجر مرتبط بالحساب فقط" }); return; }
      prefix = `rental-products/${store.id}`;
    }

    const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
    const key = `${prefix}/${crypto.randomUUID()}.${extension}`;
    const url = await uploadPublicImage({ key, body: req.file.buffer, contentType });
    res.status(201).json({ url, contentType, size: req.file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message.includes("Object storage is not configured")) {
      res.status(503).json({ error: "تخزين الصور الدائم غير مهيأ على الخادم بعد" });
      return;
    }
    req.log.error({ error }, "Image upload failed");
    res.status(502).json({ error: "تعذر رفع الصورة إلى خدمة التخزين" });
  }
});

export default router;
