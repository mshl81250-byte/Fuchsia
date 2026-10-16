import { Router } from "express";
import { deliveryQuote } from "../lib/delivery-pricing";

const router = Router();

router.get("/quote", async (req, res): Promise<void> => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 15.1 || latitude > 15.7 || longitude < 43.8 || longitude > 44.6) {
    res.status(400).json({ error: "موقع التوصيل غير صحيح أو خارج نطاق صنعاء" });
    return;
  }
  try {
    res.json(await deliveryQuote(latitude, longitude));
  } catch (error) {
    req.log.error({ error }, "Delivery quote failed");
    res.status(500).json({ error: "تعذر حساب رسوم التوصيل" });
  }
});

export default router;
