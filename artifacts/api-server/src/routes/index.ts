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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/stores", storesRouter);
router.use("/products", productsRouter);
router.use("/cart", cartRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);
router.use("/promotions", promotionsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
