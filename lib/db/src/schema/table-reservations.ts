import { mysqlTable, text, int, varchar, timestamp, index, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** A reservation request is pending until the store confirms availability. */
export const tableReservationsTable = mysqlTable("table_reservations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: int("user_id"),
  storeId: int("store_id").notNull(),
  reservationAt: timestamp("reservation_at").notNull(),
  bookingDays: int("booking_days").notNull().default(1),
  partySize: int("party_size").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  occasion: text("occasion"),
  notes: text("notes"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  paymentType: varchar("payment_type", { length: 16 }).notNull().default("deposit"),
  paymentAmount: double("payment_amount").notNull().default(0),
  platformFee: double("platform_fee").notNull().default(1000),
  paymentWalletId: int("payment_wallet_id"),
  transactionReference: varchar("transaction_reference", { length: 120 }),
  paymentReceiptUrl: text("payment_receipt_url"),
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending_review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("table_reservations_store_at_idx").on(table.storeId, table.reservationAt),
  index("table_reservations_status_at_idx").on(table.status, table.reservationAt),
]);

export const insertTableReservationSchema = createInsertSchema(tableReservationsTable).omit({ id: true, createdAt: true });
export type InsertTableReservation = z.infer<typeof insertTableReservationSchema>;
export type TableReservation = typeof tableReservationsTable.$inferSelect;
