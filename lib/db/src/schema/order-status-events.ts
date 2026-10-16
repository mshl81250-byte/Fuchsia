import { mysqlTable, text, int, varchar, timestamp, index } from "drizzle-orm/mysql-core";

/** Append-only history used by customer live order tracking. */
export const orderStatusEventsTable = mysqlTable("order_status_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  message: text("message").notNull(),
  actorType: varchar("actor_type", { length: 32 }).notNull().default("system"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("order_status_events_order_created_idx").on(table.orderId, table.createdAt)]);

export type OrderStatusEvent = typeof orderStatusEventsTable.$inferSelect;
