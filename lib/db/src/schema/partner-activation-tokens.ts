import { mysqlTable, int, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const partnerActivationTokensTable = mysqlTable("partner_activation_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdByUserId: int("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("partner_activation_tokens_hash_uq").on(table.tokenHash),
  index("partner_activation_tokens_user_idx").on(table.userId),
  index("partner_activation_tokens_expiry_idx").on(table.expiresAt),
]);

export type PartnerActivationToken = typeof partnerActivationTokensTable.$inferSelect;
