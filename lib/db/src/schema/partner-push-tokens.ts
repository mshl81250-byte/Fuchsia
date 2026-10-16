import { mysqlTable, int, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const partnerPushTokensTable = mysqlTable("partner_push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 512 }).notNull(),
  platform: varchar("platform", { length: 16 }).notNull().default("android"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("partner_push_tokens_token_uq").on(table.token),
  index("partner_push_tokens_user_idx").on(table.userId),
]);

export type PartnerPushToken = typeof partnerPushTokensTable.$inferSelect;
