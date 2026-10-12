import { mysqlTable, int, varchar, text, date, timestamp, boolean, index } from "drizzle-orm/mysql-core";

export const rentalMaintenanceBlocksTable = mysqlTable("rental_maintenance_blocks", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  quantity: int("quantity").notNull().default(1),
  reason: text("reason"),
  createdByUserId: int("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("rental_maintenance_product_range_idx").on(table.productId, table.startDate, table.endDate)]);

export const bookingChangeRequestsTable = mysqlTable("booking_change_requests", {
  id: int("id").autoincrement().primaryKey(),
  bookingType: varchar("booking_type", { length: 16 }).notNull(),
  bookingId: int("booking_id").notNull(),
  customerUserId: int("customer_user_id").notNull(),
  requestType: varchar("request_type", { length: 24 }).notNull(),
  requestedStartDate: date("requested_start_date", { mode: "string" }),
  requestedDays: int("requested_days"),
  reason: text("reason"),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  reviewedByUserId: int("reviewed_by_user_id"),
  responseNote: text("response_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("booking_change_request_booking_status_idx").on(table.bookingType, table.bookingId, table.status),
  index("booking_change_request_customer_created_idx").on(table.customerUserId, table.createdAt),
]);

export const partnerNotificationsTable = mysqlTable("partner_notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipient_user_id").notNull(),
  bookingType: varchar("booking_type", { length: 16 }),
  bookingId: int("booking_id"),
  requestId: int("request_id"),
  type: varchar("type", { length: 40 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("partner_notifications_user_created_idx").on(table.recipientUserId, table.createdAt),
  index("partner_notifications_user_read_idx").on(table.recipientUserId, table.isRead),
]);
