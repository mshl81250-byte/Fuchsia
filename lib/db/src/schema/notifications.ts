import { mysqlTable, text, int, boolean, timestamp } from "drizzle-orm/mysql-core";

export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: text("session_id").notNull(),
  orderId: int("order_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
