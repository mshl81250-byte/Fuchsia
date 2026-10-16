import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "artifacts/api-server/uploads")));

app.use("/api", router);

const adminDashboardDist = path.resolve(import.meta.dirname, "../../admin-dashboard/dist/public");
app.use("/admin-dashboard", express.static(adminDashboardDist, { index: "index.html" }));
app.use("/admin-dashboard", (req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  res.sendFile(path.join(adminDashboardDist, "index.html"), (error) => {
    if (error && !res.headersSent) next(error);
  });
});

app.get("/", (_req, res) => res.redirect(302, "/admin-dashboard/"));

export default app;
