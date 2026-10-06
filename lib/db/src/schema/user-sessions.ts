import { mysqlTable, int, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/mysql-core";

/** Opaque bearer sessions. Only the SHA-256 token digest is persisted. */
export const userSessionsTable = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_sessions_token_hash_uq").on(table.tokenHash),
  index("user_sessions_user_idx").on(table.userId),
  index("user_sessions_expiry_idx").on(table.expiresAt),
]);

export type UserSession = typeof userSessionsTable.$inferSelect;
