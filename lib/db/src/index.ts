import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
const databaseUrl =
  process.env.FUCHSIA_AIVEN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "FUCHSIA_AIVEN_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = mysql.createPool(databaseUrl);
export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
