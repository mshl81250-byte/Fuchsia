import { mysqlTable, text, varchar, double, int, timestamp, index } from "drizzle-orm/mysql-core";

export const walletTransactionsTable = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  walletId: int("wallet_id"),
  kind: varchar("kind", { length: 24 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  amount: double("amount").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("YER"),
  provider: varchar("provider", { length: 64 }).notNull().default("manual_local_wallet"),
  externalId: text("external_id"),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  reason: text("reason"),
  rawResponse: text("raw_response"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("wallet_transactions_order_idx").on(table.orderId),
  index("wallet_transactions_idempotency_idx").on(table.idempotencyKey),
]);

export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
