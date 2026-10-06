import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrations";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  try {
    await runMigrations();
    app.listen(port, () => logger.info({ port }, "Server listening"));
  } catch (err) {
    logger.error({ err }, "Database preparation or server startup failed");
    process.exit(1);
  }
}

void start();
