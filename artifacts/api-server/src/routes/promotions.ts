import { Router } from "express";
import { db } from "@workspace/db";
import { bannersTable, couponsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/banners", async (req, res): Promise<void> => {
  try {
    const banners = await db.select().from(bannersTable).where(eq(bannersTable.isActive, true)).orderBy(bannersTable.sortOrder);
    res.json(banners);
  } catch (err) {
    req.log.error({ err }, "Failed to list banners");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/coupons/validate", async (req, res): Promise<void> => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) {
      res.status(400).json({ error: "code required" });
      return;
    }

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));

    if (!coupon || !coupon.isActive) {
      res.json({ valid: false, message: "الكوبون غير صحيح أو منتهي الصلاحية" });
      return;
    }

    if (coupon.minCartTotal && cartTotal && cartTotal < coupon.minCartTotal) {
      res.json({ valid: false, message: `الحد الأدنى للطلب ${coupon.minCartTotal} ريال` });
      return;
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = cartTotal ? (cartTotal * coupon.discountValue) / 100 : 0;
    } else {
      discountAmount = coupon.discountValue;
    }

    res.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message: `تم تطبيق الخصم: ${coupon.discountValue}${coupon.discountType === "percentage" ? "%" : " ريال"}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to validate coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
