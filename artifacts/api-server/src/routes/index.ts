import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import storesRouter from "./stores";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import promotionsRouter from "./promotions";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import favoritesRouter from "./favorites";
import rewardsRouter from "./rewards";
import adminRouter from "./admin";
import vendorRouter from "./vendor";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/stores", storesRouter);
router.use("/products", productsRouter);
router.use("/cart", cartRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);
router.use("/promotions", promotionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/favorites", favoritesRouter);
router.use("/rewards", rewardsRouter);
router.use("/admin", adminRouter);
router.use("/vendor", vendorRouter);

export default router;
