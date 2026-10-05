import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const router = Router();
const uploadDir = path.resolve(process.cwd(), "artifacts/api-server/uploads/receipts");
fs.mkdirSync(uploadDir, { recursive: true });
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype)),
});

router.post("/receipt", upload.single("receipt"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "أرفق صورة إيصال بصيغة JPG أو PNG أو WebP" });
    return;
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(201).json({ url: `${baseUrl}/uploads/receipts/${req.file.filename}`, mimeType: req.file.mimetype, size: req.file.size });
});

export default router;
